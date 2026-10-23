from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from products.models import Product

# Comprehensive seed data: 10 products per category with popular brands and real image URLs
SEED = [
    # ─── SNACKS ─────────────────────────────────────────────────────────────
    ("Classic Salted Potato Chips 150g",  "Lay's",         "Snacks", 60,  "Thin-cut potatoes, lightly salted and fried to a clean crunch.",                                  ["chips", "salty", "party"],          "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=640&q=80"),
    ("Peri Peri Almond Mix 200g",         "Happilo",        "Snacks", 349, "Roasted almonds and seeds tossed in a mild peri peri seasoning.",                                  ["nuts", "protein", "healthy"],       "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=640&q=80"),
    ("Dark Chocolate 70% Cocoa 100g",     "Lindt",          "Snacks", 220, "Smooth, slightly bitter dark chocolate with a rich, lasting finish.",                               ["chocolate", "dark", "treat"],       "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=640&q=80"),
    ("Peanut Protein Bar Pack of 6",      "RiteBite",       "Snacks", 480, "High-protein peanut bars made for on-the-go breakfasts and gym bags.",                             ["protein", "bar", "gym"],            "https://images.unsplash.com/photo-1622484212850-eb596d769edc?w=640&q=80"),
    ("Masala Biscuits 300g",              "Parle",          "Snacks", 45,  "Crispy biscuits seasoned with aromatic Indian spices for a savoury snack.",                        ["biscuit", "spicy", "snack"],        "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=640&q=80"),
    ("Roasted Peanuts 500g",              "Bikano",         "Snacks", 120, "Crunchy roasted peanuts lightly salted — perfect for movie nights.",                               ["peanuts", "roasted", "crunchy"],   "https://images.unsplash.com/photo-1574856344991-aaa31b6f4ce3?w=640&q=80"),
    ("Mango Chilli Popcorn 100g",         "Bingo!",         "Snacks", 35,  "Fluffy popcorn dusted with tangy mango chilli seasoning.",                                         ["popcorn", "mango", "tangy"],       "https://images.unsplash.com/photo-1613382064038-18e71abe0d84?w=640&q=80"),
    ("Oat Granola Bars Pack of 5",        "Yoga Bar",       "Snacks", 275, "Wholesome oat-and-honey granola bars — filling, nutritious, and travel-ready.",                    ["granola", "oats", "healthy"],      "https://images.unsplash.com/photo-1490567674331-8a5e3d4a8a7e?w=640&q=80"),
    ("Cheese Crackers 200g",              "Britannia",      "Snacks", 80,  "Light, crispy crackers with a generous dusting of real cheese powder.",                            ["crackers", "cheese", "snack"],     "https://images.unsplash.com/photo-1587334274328-64186a80aeee?w=640&q=80"),
    ("Trail Mix Berries & Nuts 250g",     "True Elements",  "Snacks", 320, "A wholesome blend of dried berries, cashews, and almonds for mindful snacking.",                   ["trail-mix", "berries", "nuts"],    "https://images.unsplash.com/photo-1511688878353-3a2f5be94cd7?w=640&q=80"),

    # ─── BEVERAGES ──────────────────────────────────────────────────────────
    ("Sparkling Lemon Water 750ml",       "Bisleri",        "Beverages", 45,  "Lightly carbonated water with a crisp lemon finish and zero sugar.",                             ["sparkling", "zero sugar", "lemon"], "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=640&q=80"),
    ("Cold Brew Coffee Cans 4×250ml",     "Blue Tokai",     "Beverages", 399, "Slow-steeped cold brew coffee, ready to drink straight from the can.",                          ["coffee", "cold brew", "caffeine"], "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=640&q=80"),
    ("Masala Chai Tea Bags 50-pack",      "Twinings",       "Beverages", 275, "Assam black tea blended with cardamom, ginger and cinnamon.",                                   ["tea", "masala", "chai"],           "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=640&q=80"),
    ("Orange Juice 1L No Added Sugar",    "Tropicana",      "Beverages", 130, "Cold-pressed orange juice with no added sugar or preservatives.",                                ["juice", "orange", "fresh"],        "https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=640&q=80"),
    ("Green Tea Honey Lemon 25 Bags",     "Lipton",         "Beverages", 150, "Delicate green tea with a hint of natural honey and lemon for a calming cup.",                  ["green tea", "honey", "lemon"],     "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=640&q=80"),
    ("Coconut Water 330ml Can",           "Raw Pressery",   "Beverages", 65,  "Pure, naturally sweet coconut water packed with electrolytes.",                                  ["coconut", "electrolytes", "natural"], "https://images.unsplash.com/photo-1601566471862-7a31ef0ac1a6?w=640&q=80"),
    ("Mango Lassi 200ml Bottle",          "Amul",           "Beverages", 40,  "Thick and creamy mango lassi made with real Alphonso mangoes and curd.",                        ["lassi", "mango", "dairy"],         "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=640&q=80"),
    ("Energy Drink 250ml Can",            "RedBull",        "Beverages", 125, "Classic energy drink with caffeine, taurine and B-vitamins to keep you going.",                 ["energy", "caffeine", "boost"],     "https://images.unsplash.com/photo-1591753576706-26a1e5c73ab5?w=640&q=80"),
    ("Iced Latte RTD 300ml",              "Nescafé",        "Beverages", 90,  "Ready-to-drink iced latte made with real espresso and fresh milk — perfectly chilled.",          ["coffee", "iced", "latte"],         "https://images.unsplash.com/photo-1485808191679-5f86510bd9d4?w=640&q=80"),
    ("Pomegranate Juice 1L",              "Paper Boat",     "Beverages", 175, "Rich, ruby-red pomegranate juice bursting with antioxidants — no preservatives.",               ["pomegranate", "juice", "healthy"], "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=640&q=80"),

    # ─── PERSONAL CARE ──────────────────────────────────────────────────────
    ("Charcoal Face Wash 100ml",          "Himalaya",       "Personal Care", 249, "Gel face wash with activated charcoal that lifts oil and city grime.",                      ["face wash", "charcoal", "oily skin"], "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=640&q=80"),
    ("Herbal Shampoo 340ml",              "Dove",           "Personal Care", 310, "Gentle daily shampoo with hibiscus and amla for soft, manageable hair.",                    ["shampoo", "herbal", "hair care"],  "https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=640&q=80"),
    ("Whitening Toothpaste 150g",         "Colgate",        "Personal Care", 99,  "Fluoride toothpaste that helps remove surface stains with daily brushing.",                 ["toothpaste", "whitening", "oral care"], "https://images.unsplash.com/photo-1609840112855-9c8ec18b2b56?w=640&q=80"),
    ("Moisturising Body Lotion 400ml",    "Nivea",          "Personal Care", 375, "Deeply nourishing body lotion with shea butter for silky-smooth skin.",                     ["lotion", "moisturiser", "skin care"], "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=640&q=80"),
    ("SPF 50 Sunscreen 80ml",             "Lotus",          "Personal Care", 299, "Lightweight, non-greasy sunscreen that protects against UVA/UVB rays.",                     ["sunscreen", "SPF", "protection"],  "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=640&q=80"),
    ("Anti-Dandruff Shampoo 360ml",       "Head & Shoulders", "Personal Care", 290, "Clinically proven formula that removes dandruff flakes from the first wash.",             ["shampoo", "dandruff", "scalp"],    "https://images.unsplash.com/photo-1526758097130-bab247274f58?w=640&q=80"),
    ("Natural Deodorant Stick 75g",       "Dove",           "Personal Care", 199, "48-hour odour protection with nourishing moisturisers — gentle on skin.",                   ["deodorant", "natural", "protection"], "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=640&q=80"),
    ("Rose Water Face Toner 200ml",       "Forest Essentials","Personal Care", 695, "Pure distilled rose water toner that refreshes and tones skin instantly.",                ["toner", "rose water", "skin care"],"https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=640&q=80"),
    ("Aloe Vera Gel 200g",               "Mamaearth",      "Personal Care", 179, "Pure aloe vera gel that soothes, hydrates, and calms irritated skin.",                      ["aloe vera", "gel", "soothing"],    "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=640&q=80"),
    ("Lip Balm SPF 15 Pack of 3",        "Vaseline",       "Personal Care", 149, "Nourishing lip balm with petroleum jelly and SPF 15 for soft, protected lips.",             ["lip balm", "SPF", "moisturiser"],  "https://images.unsplash.com/photo-1599305090598-fe179d501227?w=640&q=80"),

    # ─── ELECTRONICS ────────────────────────────────────────────────────────
    ("Wireless Earbuds Pro",              "boAt",           "Electronics", 1999,  "True wireless earbuds with 30-hr battery, deep bass and IPX4 water resistance.",            ["earbuds", "wireless", "audio"],    "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=640&q=80"),
    ("Noise-Cancelling Headphones",       "Sony",           "Electronics", 7499,  "Over-ear ANC headphones with 30-hr playback and premium audio clarity.",                    ["headphones", "anc", "wireless"],   "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=640&q=80"),
    ("Smart Fitness Band 2",              "Mi",             "Electronics", 1999,  "Slim fitness band tracking steps, heart rate and sleep with 14-day battery.",               ["fitness", "wearable", "tracker"],  "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=640&q=80"),
    ("10000mAh Power Bank",               "Anker",          "Electronics", 1299,  "Compact power bank that charges two devices simultaneously with fast-charge technology.",    ["power bank", "charging", "portable"], "https://images.unsplash.com/photo-1609592560536-a2e11ed9e33e?w=640&q=80"),
    ("USB-C Braided Cable 2m",            "OnePlus",        "Electronics", 299,   "Durable braided USB-C cable supporting 65W fast charging and data transfer.",               ["cable", "usb-c", "fast charge"],   "https://images.unsplash.com/photo-1601997-1bfc01ab0e91?w=640&q=80"),
    ("Mechanical Keyboard TKL",           "Keychron",       "Electronics", 6499,  "Tenkeyless mechanical keyboard with Gateron switches and RGB backlight.",                   ["keyboard", "mechanical", "gaming"],"https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=640&q=80"),
    ("Smart LED Bulb 9W",                 "Philips",        "Electronics", 449,   "Wi-Fi enabled smart LED bulb with 16 million colours and voice control support.",           ["smart home", "LED", "bulb"],       "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=640&q=80"),
    ("Portable Bluetooth Speaker",        "JBL",            "Electronics", 3499,  "Waterproof portable speaker with 12-hour playtime and deep, punchy bass.",                  ["speaker", "bluetooth", "portable"],"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=640&q=80"),
    ("Gaming Mouse RGB",                  "Logitech",       "Electronics", 2799,  "Precision gaming mouse with 25,600 DPI, programmable buttons and RGB lighting.",            ["gaming", "mouse", "rgb"],          "https://images.unsplash.com/photo-1527814050087-3793815479db?w=640&q=80"),
    ("Webcam 1080p Full HD",              "Logitech",       "Electronics", 3999,  "Full HD webcam with autofocus, built-in mic and plug-and-play USB for video calls.",         ["webcam", "HD", "video call"],      "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=640&q=80"),

    # ─── HOME CARE ──────────────────────────────────────────────────────────
    ("Dishwash Liquid Lemon 750ml",       "Vim",            "Home Care", 175, "Concentrated lemon dishwash liquid that cuts grease with less scrubbing.",                      ["dishwash", "lemon", "cleaning"],   "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=640&q=80"),
    ("Floor Cleaner Lavender 1L",         "Lizol",          "Home Care", 195, "Disinfecting floor cleaner with a calming lavender scent — kills 99.9% germs.",                 ["floor cleaner", "lavender", "disinfectant"], "https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?w=640&q=80"),
    ("Fabric Conditioner Rose 1.5L",      "Comfort",        "Home Care", 299, "Ultra-concentrated fabric conditioner that leaves clothes soft and smelling fresh.",            ["fabric", "conditioner", "soft"],   "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=640&q=80"),
    ("Toilet Cleaner Thick 500ml",        "Domex",          "Home Care", 120, "Thick bleach formula that clings under the rim to disinfect and remove stains.",               ["toilet", "cleaner", "disinfectant"],"https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=640&q=80"),
    ("Multi-Surface Spray 500ml",         "Colin",          "Home Care", 145, "Streak-free glass and surface cleaner that tackles grease and fingerprints fast.",             ["surface cleaner", "glass", "spray"],"https://images.unsplash.com/photo-1563453392212-326f5e854473?w=640&q=80"),
    ("Laundry Detergent Powder 2kg",      "Ariel",          "Home Care", 395, "Advanced stain-removal laundry powder that works in both cold and warm water.",               ["laundry", "detergent", "stain"],   "https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=640&q=80"),
    ("Air Freshener Spray Jasmine 300ml", "Odonil",         "Home Care", 185, "Long-lasting jasmine air freshener that neutralises bad odours and refreshes any room.",       ["air freshener", "jasmine", "fragrance"], "https://images.unsplash.com/photo-1585771619441-f8c41d5d2499?w=640&q=80"),
    ("Dish Soap Bar Neem 200g",           "Pril",           "Home Care", 55,  "Tough on grease, gentle on hands — neem-infused dish soap bar for everyday use.",              ["dish soap", "neem", "bar"],        "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=640&q=80"),
    ("Toilet Paper Rolls Pack of 6",      "Selpak",         "Home Care", 220, "3-ply soft toilet paper rolls with a gentle, skin-friendly texture.",                          ["toilet paper", "tissue", "soft"],  "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=640&q=80"),
    ("Garbage Bags Large 30L Pack of 30", "Biodegradable Co","Home Care", 299, "Extra-strong biodegradable garbage bags that tie securely with no tear or leak.",             ["garbage bags", "eco", "biodegradable"], "https://images.unsplash.com/photo-1528323273322-d81458248d40?w=640&q=80"),
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
        for name, brand, category, price, desc, tags, image_url in SEED:
            matches = list(Product.objects.filter(name=name))
            if matches:
                p = matches[0]
                p.brand = brand
                p.category = category
                p.price = price
                p.description = desc
                p.tags = tags
                p.image_url = image_url
                p.save()
                # Clean up any duplicate copies if they exist
                if len(matches) > 1:
                    for dup in matches[1:]:
                        dup.delete()
            else:
                Product.objects.create(
                    name=name, brand=brand, category=category, price=price,
                    description=desc, tags=tags, owner=user, image_url=image_url,
                )
                added += 1
        self.stdout.write(self.style.SUCCESS(f"Seed complete: {added} new products. Login: demo / Demo@12345"))
