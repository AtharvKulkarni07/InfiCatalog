import logging

from django.core.cache import cache
from django.db.models import Max, Min, Q
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .filters import ProductFilter
from .models import Product
from .permissions import IsOwnerOrReadOnly
from .serializers import ProductSerializer

logger = logging.getLogger(__name__)


class SmartSearchFilter(SearchFilter):
    """
    Resilient multi-field search filter.
    Tries strict all-terms AND matching first. If that returns no matches,
    falls back to multi-term OR matching across name, brand, category, description, and tags
    so that multi-word natural queries never yield an unexpected 0 results.
    """

    def filter_queryset(self, request, queryset, view):
        search_terms = self.get_search_terms(request)
        if not search_terms:
            return queryset

        fields = getattr(view, "search_fields", ["name", "brand", "category", "description", "tags"])

        # 1. Strict AND match: each term must match at least one field
        strict_q = Q()
        for term in search_terms:
            term_q = Q()
            for field in fields:
                term_q |= Q(**{f"{field}__icontains": term})
            strict_q &= term_q

        strict_qs = queryset.filter(strict_q).distinct()
        if strict_qs.exists():
            return strict_qs

        # 2. Resilient OR fallback: any term matches any field
        or_q = Q()
        for term in search_terms:
            for field in fields:
                or_q |= Q(**{f"{field}__icontains": term})

        return queryset.filter(or_q).distinct()


class ProductViewSet(viewsets.ModelViewSet):
    """
    CRUD for products.

    * **Search:** `?search=` (name, brand, category, description, tags)
    * **Filter:** `?category=&brand=&min_price=&max_price=&tags=&exclude=&mine=true`
    * **Sort:** `?ordering=price` / `-price` / `name` / `-created_at`
    * **Paginate:** `?page=2&page_size=12`
    """

    queryset = Product.objects.select_related("owner")
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    filterset_class = ProductFilter
    filter_backends = [DjangoFilterBackend, SmartSearchFilter, OrderingFilter]
    search_fields = ["name", "brand", "category", "description", "tags"]
    ordering_fields = ["price", "name", "created_at"]
    ordering = ["-created_at"]

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        # Zero-result intelligent relaxation:
        # If strict filtering returned 0 items, check if we can relax the most restrictive filter
        if not queryset.exists():
            relaxed_qs, note = self._relax_query(request)
            if relaxed_qs is not None and relaxed_qs.exists():
                queryset = relaxed_qs
                if self.paginator is not None:
                    setattr(self.paginator, "relaxation_note", note)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def _relax_query(self, request):
        base_qs = self.get_queryset()
        if request.query_params.get("mine") in ("true", "1") and request.user.is_authenticated:
            base_qs = base_qs.filter(owner=request.user)

        cat = request.query_params.get("category", "").strip()
        brand = request.query_params.get("brand", "").strip()
        max_price = request.query_params.get("max_price", "").strip()
        search = request.query_params.get("search", "").strip()

        # Step 1: If max_price caused 0 results, relax max_price
        if max_price:
            attempt_qs = base_qs
            if cat:
                attempt_qs = attempt_qs.filter(category__iexact=cat)
            if brand:
                attempt_qs = attempt_qs.filter(brand__iexact=brand)
            if attempt_qs.exists():
                entity = f"'{brand}'" if brand else f"in {cat}"
                return attempt_qs, f"No products found under ₹{max_price}. Showing available items {entity}."

        # Step 2: If brand caused 0 results, relax brand
        if brand and cat:
            cat_qs = base_qs.filter(category__iexact=cat)
            if cat_qs.exists():
                return cat_qs, f"No '{brand}' products found in {cat}. Showing other items in {cat}."

        # Step 3: If search caused 0 results, relax search to category
        if cat and search:
            cat_qs = base_qs.filter(category__iexact=cat)
            if cat_qs.exists():
                return cat_qs, f"No exact matches for '{search}'. Showing popular items in {cat}."

        return None, None

    def perform_create(self, serializer):
        product = serializer.save(owner=self.request.user)
        logger.info("Product %s created by %s", product.pk, self.request.user.username)

    def perform_update(self, serializer):
        product = serializer.save()
        logger.info("Product %s updated by %s", product.pk, self.request.user.username)

    def perform_destroy(self, instance):
        logger.info("Product %s deleted by %s", instance.pk, self.request.user.username)
        instance.delete()

    @extend_schema(
        responses={200: dict},
        description="Distinct categories, brands and price range - used to populate filter controls.",
    )
    @action(detail=False, methods=["get"], pagination_class=None, filter_backends=[])
    def facets(self, request):
        is_mine = request.query_params.get("mine") in ("true", "1") and request.user.is_authenticated
        selected_category = request.query_params.get("category", "").strip()

        # Cache key per user workspace or global catalog
        cache_key = f"catalog:facets:{request.user.id if is_mine else 'global'}:{selected_category.lower()}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        qs = Product.objects.all()
        if is_mine:
            qs = qs.filter(owner=request.user)

        # Build category -> brands mapping for instant frontend filtering
        cat_brands = {}
        for cat, brand in qs.order_by().values_list("category", "brand").distinct():
            c = (cat or "").strip()
            b = (brand or "").strip()
            if c and b:
                cat_brands.setdefault(c, set()).add(b)

        categories = sorted(
            {c.strip() for c in qs.order_by().values_list("category", flat=True) if c and c.strip()},
            key=str.lower,
        )

        brand_qs = qs.filter(category__iexact=selected_category) if selected_category else qs
        brands = sorted(
            {b.strip() for b in brand_qs.order_by().values_list("brand", flat=True) if b and b.strip()},
            key=str.lower,
        )

        bounds = qs.aggregate(min=Min("price"), max=Max("price"))
        data = {
            "categories": categories,
            "brands": brands,
            "category_brands": {c: sorted(list(b_set), key=str.lower) for c, b_set in cat_brands.items()},
            "price_min": bounds["min"],
            "price_max": bounds["max"],
        }
        cache.set(cache_key, data, timeout=1800)  # Cache for 30 minutes
        return Response(data)
