from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from genai import services
from products.models import Product

User = get_user_model()


def make_product(owner=None, **kw):
    data = dict(name="Test Chips", brand="CrunchCo", category="Snacks", price=50, description="d")
    data.update(kw)
    return Product.objects.create(owner=owner, **data)


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_login_me(self):
        r = self.client.post("/api/auth/register/", {"username": "ana", "email": "ana@x.com", "password": "Str0ng!Pass99"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertIn("access", r.data)
        r = self.client.post("/api/auth/login/", {"username": "ana", "password": "Str0ng!Pass99"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        self.assertEqual(self.client.get("/api/auth/me/").data["username"], "ana")

    def test_weak_password_and_duplicate_email_rejected(self):
        r = self.client.post("/api/auth/register/", {"username": "bob", "email": "b@x.com", "password": "123"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["error"]["code"], "validation_error")
        self.assertIn("password", r.data["error"]["details"])

    def test_bad_login_uses_error_envelope(self):
        r = self.client.post("/api/auth/login/", {"username": "x", "password": "y"}, format="json")
        self.assertEqual(r.status_code, 401)
        self.assertIn("message", r.data["error"])


class ProductTests(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "a@x.com", "pass12345!")
        self.bob = User.objects.create_user("bob", "b@x.com", "pass12345!")
        self.client = APIClient()

    def test_public_read_but_write_requires_auth(self):
        make_product(self.alice)
        self.assertEqual(self.client.get("/api/products/").status_code, 200)
        r = self.client.post("/api/products/", {"name": "x"}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_create_validates_input(self):
        self.client.force_authenticate(self.alice)
        r = self.client.post("/api/products/", {"name": "  ", "brand": "B", "category": "C", "price": "-5"}, format="json")
        self.assertEqual(r.status_code, 400)
        details = r.data["error"]["details"]
        self.assertIn("name", details)
        self.assertIn("price", details)

    def test_crud_and_ownership(self):
        self.client.force_authenticate(self.alice)
        r = self.client.post("/api/products/", {"name": "Cola", "brand": "Fizz", "category": "Beverages", "price": "40.00", "tags": ["Soda", "soda", "cold"]}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["tags"], ["soda", "cold"])
        pid = r.data["id"]
        self.assertEqual(self.client.patch(f"/api/products/{pid}/", {"price": "45.00"}, format="json").status_code, 200)
        self.client.force_authenticate(self.bob)
        self.assertEqual(self.client.delete(f"/api/products/{pid}/").status_code, 403)
        self.client.force_authenticate(self.alice)
        self.assertEqual(self.client.delete(f"/api/products/{pid}/").status_code, 204)
        self.assertEqual(self.client.get(f"/api/products/{pid}/").status_code, 404)

    def test_search_filter_sort_paginate(self):
        for i in range(15):
            make_product(self.alice, name=f"Item {i}", price=10 + i, brand="A" if i % 2 else "B", category="Snacks")
        make_product(self.alice, name="Green Tea", brand="Chaiwala", category="Beverages", price=500)
        r = self.client.get("/api/products/", {"page_size": 5})
        self.assertEqual(r.data["count"], 16)
        self.assertEqual(len(r.data["results"]), 5)
        self.assertEqual(self.client.get("/api/products/", {"search": "tea"}).data["count"], 1)
        self.assertEqual(self.client.get("/api/products/", {"category": "beverages"}).data["count"], 1)
        r = self.client.get("/api/products/", {"min_price": 20, "max_price": 24, "ordering": "-price"})
        self.assertEqual([p["name"] for p in r.data["results"]][0], "Item 14")
        self.assertEqual(r.data["count"], 5)

    def test_facets(self):
        make_product(self.alice, price=10)
        make_product(self.alice, name="Tea", category="Beverages", price=90)
        r = self.client.get("/api/products/facets/")
        self.assertEqual(r.data["categories"], ["Beverages", "Snacks"])


class GenAITests(TestCase):
    def test_rule_based_search_fallback(self):
        res = services.parse_search_query("cheap snacks under 500 from CrunchCo", ["Snacks", "Beverages"], ["CrunchCo"])
        f = res["filters"]
        self.assertEqual(res["source"], "fallback")
        self.assertEqual(f["category"], "Snacks")
        self.assertEqual(f["brand"], "CrunchCo")
        self.assertEqual(f["max_price"], 500)
        self.assertEqual(f["ordering"], "price")

    def test_sanitizer_drops_hallucinated_values(self):
        f = services._sanitize_filters(
            {"category": "Spaceships", "brand": "crunchco", "min_price": "900", "max_price": "100", "ordering": "DROP TABLE"},
            ["Snacks"], ["CrunchCo"],
        )
        self.assertNotIn("category", f)
        self.assertEqual(f["brand"], "CrunchCo")
        self.assertEqual((f["min_price"], f["max_price"]), (100, 900))
        self.assertNotIn("ordering", f)

    def test_endpoints_work_without_api_key(self):
        user = User.objects.create_user("u", "u@x.com", "pass12345!")
        c = APIClient()
        self.assertEqual(c.post("/api/ai/generate-description/", {"name": "A", "brand": "B", "category": "C"}, format="json").status_code, 401)
        c.force_authenticate(user)
        r = c.post("/api/ai/generate-description/", {"name": "A", "brand": "B", "category": "C"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["source"], "fallback")
        r = c.post("/api/ai/suggest-tags/", {"name": "Almond Mix", "brand": "B", "category": "Snacks"}, format="json")
        self.assertTrue(r.data["tags"])
        self.assertEqual(APIClient().post("/api/ai/search/", {"query": "tea"}, format="json").status_code, 200)
