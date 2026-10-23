from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from products.models import Product

# Retail / CPG-flavoured demo data (Infilect's world: shelves, brands, FMCG).
SEED = [
    ("Classic Salted Potato Chips 150g", "CrunchCo", "Snacks", 60, "Thin-cut potatoes, lightly salted and fried to a clean crunch.", ["chips", "salty", "party"]),
    ("Peri Peri Almond Mix 200g", "NutriNest", "Snacks", 349, "Roasted almonds and seeds tossed in a mild peri peri seasoning.", ["nuts", "protein", "healthy"]),
    ("Dark Chocolate 70% Cocoa 100g", "Cocoa Lane", "Snacks", 220, "Smooth, slightly bitter dark chocolate for a rich, lasting finish.", ["chocolate", "dark", "treat"]),
    ("Peanut Protein Bar Pack of 6", "FitFuel", "Snacks", 480, "High-protein peanut bars made for on-the-go breakfasts and gym bags.", ["protein", "bar", "gym"]),
    ("Sparkling Lemon Water 750ml", "AquaPop", "Beverages", 45, "Lightly carbonated water with a crisp lemon finish and zero sugar.", ["sparkling", "zero sugar", "lemon"]),
    ("Cold Brew Coffee Cans (4 x 250ml)", "BeanRoute", "Beverages", 399, "Slow-steeped cold brew coffee, ready to drink straight from the can.", ["coffee", "cold brew", "caffeine"]),
    ("Masala Chai Tea Bags (50)", "Chaiwala", "Beverages", 275, "Assam black tea blended with cardamom, ginger and cinnamon.", ["tea", "masala", "chai"]),
    ("Orange Juice 1L (No Added Sugar)", "Orchard Fresh", "Beverages", 130, "Cold-pressed orange juice with no added sugar or preservatives.", ["juice", "orange", "fresh"]),
    ("Charcoal Face Wash 100ml", "GlowLab", "Personal Care", 249, "Gel face wash with activated charcoal that lifts oil and city grime.", ["face wash", "charcoal", "oily skin"]),
    ("Herbal Shampoo 340ml", "Veda Roots", "Personal Care", 310, "Gentle daily shampoo with hibiscus and amla for soft, manageable hair.", ["shampoo", "herbal", "hair care"]),
    ("Whitening Toothpaste 150g", "BrightDent", "Personal Care", 99, "Fluoride toothpaste that helps remove surface stains with daily brushing.", ["toothpaste", "whitening", "oral care"]),
    ("Wireless Earbuds Pro", "SonicWave", "Electronics", 2999, "Compact true wireless earbuds with a charging case and low-latency mode.", ["earbuds", "wireless", "audio"]),
    ("Noise-Cancelling Headphones", "SonicWave", "Electronics", 7499, "Over-ear headphones with active noise cancelling and long battery life.", ["headphones", "anc", "wireless"]),
    ("Smart Fitness Band 2", "PulseFit", "Electronics", 1999, "Slim fitness band tracking steps, heart rate and sleep with a week of battery.", ["fitness", "wearable", "tracker"]),
    ("Dishwash Liquid Lemon 750ml", "SparkHome", "Home Care", 175, "Concentrated lemon dishwash liquid that cuts grease with less scrubbing.", ["dishwash", "lemon", "cleaning"]),
    ("Floor Cleaner Lavender 1L", "SparkHome", "Home Care", 195, "Disinfecting floor cleaner with a calming lavender scent.", ["floor cleaner", "lavender", "disinfectant"]),
]


class Command(BaseCommand):
    help = "Create demo data: a demo user (demo / Demo@12345) and sample products. Safe to re-run."

    def handle(self, *args, **opts):
        User = get_user_model()
        user, created = User.objects.get_or_create(username="demo", defaults={"email": "demo@example.com"})
        if created:
            user.set_password("Demo@12345")
            user.save()
        added = 0
        for name, brand, category, price, desc, tags in SEED:
            slug = name.lower().replace(" ", "-").replace("(", "").replace(")", "")[:40]
            _, was_new = Product.objects.get_or_create(
                name=name,
                brand=brand,
                defaults=dict(
                    category=category, price=price, description=desc, tags=tags, owner=user,
                    image_url=f"https://picsum.photos/seed/{slug}/640/480",
                ),
            )
            added += was_new
        self.stdout.write(self.style.SUCCESS(f"Seed complete: {added} new products. Login: demo / Demo@12345"))
