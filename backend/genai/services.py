"""GenAI features for the catalog, built on Google Gemini's REST API.

Design: every feature has a deterministic fallback, so the product never breaks when the LLM key is
missing, rate limited, or returns garbage. Responses say which path produced them via `source`.
"""
import hashlib
import json
import logging
import re

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

SEARCH_KEYS = {"search", "category", "brand", "min_price", "max_price", "ordering", "tags", "exclude"}
ALLOWED_ORDERING = {"price", "-price", "name", "-name", "-created_at", "created_at"}


class LLMError(Exception):
    pass


def _call_gemini(prompt: str, *, system: str | None = None, json_mode: bool = False, temperature=0.6) -> str:
    if not settings.GEMINI_API_KEY:
        raise LLMError("GEMINI_API_KEY not configured")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": temperature, "maxOutputTokens": 600},
    }
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    if json_mode:
        body["generationConfig"]["responseMimeType"] = "application/json"
    try:
        resp = requests.post(url, json=body, headers={"x-goog-api-key": settings.GEMINI_API_KEY}, timeout=20)
        resp.raise_for_status()
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (requests.RequestException, KeyError, IndexError, ValueError) as exc:
        logger.warning("Gemini call failed: %s", exc)
        raise LLMError(str(exc)) from exc


def _parse_json(text: str):
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    return json.loads(text)


# --------------------------------------------------------------------------- descriptions
def generate_description(name: str, brand: str, category: str, tone: str = "friendly") -> dict:
    system = (
        "You are an e-commerce copywriter for a retail product catalog. Write accurate, specific, "
        "benefit-led copy. Never invent certifications, ingredients, specs or numbers that were not given."
    )
    prompt = (
        f"Write a product description of 2-3 sentences (max 60 words), {tone} tone, plain text, no markdown.\n"
        f"Product name: {name}\nBrand: {brand}\nCategory: {category}"
    )
    try:
        return {"description": _call_gemini(prompt, system=system), "source": "llm"}
    except LLMError:
        text = (
            f"{name} from {brand} is a dependable pick in {category}. "
            f"Designed for everyday use, it brings the quality you expect from {brand} at a fair price."
        )
        return {"description": text, "source": "fallback"}


# --------------------------------------------------------------------------- tags
def suggest_tags(name: str, brand: str, category: str, description: str = "") -> dict:
    prompt = (
        "Suggest 5 short, lowercase search tags (1-2 words each) for this product. "
        'Return ONLY a JSON array of strings, e.g. ["tag one","tag two"].\n'
        f"Name: {name}\nBrand: {brand}\nCategory: {category}\nDescription: {description[:400]}"
    )
    try:
        tags = _parse_json(_call_gemini(prompt, json_mode=True, temperature=0.3))
        tags = [str(t).strip().lower()[:30] for t in tags if str(t).strip()][:8]
        if tags:
            return {"tags": tags, "source": "llm"}
    except (LLMError, ValueError, TypeError):
        pass
    words = re.findall(r"[a-zA-Z]{3,}", f"{name} {category}".lower())
    seen = []
    for w in words + [brand.lower()]:
        if w not in seen:
            seen.append(w)
    return {"tags": seen[:6], "source": "fallback"}


# --------------------------------------------------------------------------- natural-language search
def _sanitize_filters(raw: dict, categories: list[str], brands: list[str]) -> dict:
    """Whitelist keys, coerce types, and match values to real catalog values."""
    out = {}
    lookup = {"category": {c.lower(): c for c in categories}, "brand": {b.lower(): b for b in brands}}
    for field in ("category", "brand"):
        val = str(raw.get(field) or "").strip().lower()
        if val in lookup[field]:
            out[field] = lookup[field][val]
    for field in ("min_price", "max_price"):
        try:
            num = float(raw.get(field))
            if num >= 0:
                out[field] = num
        except (TypeError, ValueError):
            pass
    if "min_price" in out and "max_price" in out and out["min_price"] > out["max_price"]:
        out["min_price"], out["max_price"] = out["max_price"], out["min_price"]

    # Tags: list or comma-separated string
    raw_tags = raw.get("tags")
    if isinstance(raw_tags, list):
        clean_tags = [str(t).strip().lower() for t in raw_tags if str(t).strip()]
        if clean_tags:
            out["tags"] = ",".join(clean_tags[:6])
    elif isinstance(raw_tags, str) and raw_tags.strip():
        clean_tags = [t.strip().lower() for t in raw_tags.split(",") if t.strip()]
        if clean_tags:
            out["tags"] = ",".join(clean_tags[:6])

    # Exclude: list or comma-separated string
    raw_ex = raw.get("exclude")
    if isinstance(raw_ex, list):
        clean_ex = [str(e).strip().lower() for e in raw_ex if str(e).strip()]
        if clean_ex:
            out["exclude"] = ",".join(clean_ex[:5])
    elif isinstance(raw_ex, str) and raw_ex.strip():
        clean_ex = [e.strip().lower() for e in raw_ex.split(",") if e.strip()]
        if clean_ex:
            out["exclude"] = ",".join(clean_ex[:5])

    search = " ".join(str(raw.get("search") or "").split())[:100]
    if search:
        out["search"] = search
    if raw.get("ordering") in ALLOWED_ORDERING:
        out["ordering"] = raw["ordering"]
    return out


def _rule_based_filters(query: str, categories: list[str], brands: list[str]) -> tuple[dict, str]:
    q = query.lower()
    raw = {}
    reasoning_parts = []

    # Category matching with synonym support
    cat_synonyms = {
        "Beverages": ["drink", "drinks", "beverage", "beverages", "tea", "coffee", "juice", "soda", "latte", "water"],
        "Groceries": ["snack", "snacks", "food", "grocery", "groceries", "oats", "chips", "nuts", "biscuit", "cookies"],
        "Home Care": ["clean", "cleaner", "cleaning", "detergent", "utensil", "utensils", "dishes", "dish", "soap bar", "toilet", "floor"],
        "Personal Care": ["shampoo", "skincare", "skin", "hair", "scalp", "dandruff", "lotion", "face wash", "body wash", "toothpaste"],
        "Electronics": ["headphone", "headphones", "earbuds", "earbud", "audio", "mouse", "keyboard", "cable", "charger", "gadget"],
    }

    matched_cat = None
    for c in categories:
        if c.lower() in q:
            matched_cat = c
            q = q.replace(c.lower(), " ")
            break

    if not matched_cat:
        for c, syns in cat_synonyms.items():
            if any(syn in q for syn in syns):
                for actual_c in categories:
                    if actual_c.lower() == c.lower():
                        matched_cat = actual_c
                        break
                if matched_cat:
                    break

    if matched_cat:
        raw["category"] = matched_cat
        reasoning_parts.append(f"in {matched_cat}")

    # Brand matching
    for b in brands:
        if b.lower() in q:
            raw["brand"] = b
            q = q.replace(b.lower(), " ")
            reasoning_parts.append(f"from {b}")
            break

    # Negation / Exclusion extraction
    exclude_terms = []
    if m := re.search(r"(?:without|no|zero|free from|non)\s+([a-z]+)", q):
        ex_word = m.group(1).strip()
        if ex_word in ("sugar", "caffeine", "dairy", "chocolate", "alcohol", "oil"):
            exclude_terms.append(ex_word)
            q = q.replace(m.group(0), " ")
    if "sugar-free" in q or "sugar free" in q:
        exclude_terms.append("sugar")
        q = q.replace("sugar-free", " ").replace("sugar free", " ")
    if exclude_terms:
        raw["exclude"] = exclude_terms
        reasoning_parts.append(f"excluding {', '.join(exclude_terms)}")

    # Price parsing
    num = r"(?:rs\.?|inr|₹)?\s*(\d[\d,]*(?:\.\d+)?)"
    if m := re.search(rf"(?:under|below|less than|cheaper than|max|upto|up to)\s*{num}", q):
        val = float(m.group(1).replace(",", ""))
        raw["max_price"] = val
        q = q.replace(m.group(0), " ")
        reasoning_parts.append(f"under ₹{int(val)}")
    if m := re.search(rf"(?:over|above|more than|at least|min)\s*{num}", q):
        val = float(m.group(1).replace(",", ""))
        raw["min_price"] = val
        q = q.replace(m.group(0), " ")
        reasoning_parts.append(f"above ₹{int(val)}")

    # Ordering
    if re.search(r"\b(cheapest|cheap|affordable|budget)\b", q):
        raw["ordering"] = "price"
        reasoning_parts.append("sorted by lowest price")
    elif re.search(r"\b(expensive|premium|priciest)\b", q):
        raw["ordering"] = "-price"
        reasoning_parts.append("sorted by premium price")

    # Intent-to-Tag mapping
    tags = []
    if any(w in q for w in ("workout", "energy", "gym", "fitness", "tired", "boost")):
        tags.extend(["energy", "caffeine"])
    if any(w in q for w in ("dandruff", "scalp", "itchy")):
        tags.extend(["dandruff", "scalp"])
        raw.setdefault("search", "shampoo")
    if any(w in q for w in ("utensil", "utensils", "greasy", "oily", "dishes")):
        tags.extend(["dish soap", "cleaner"])
    if any(w in q for w in ("crunchy", "crispy", "movie")):
        tags.extend(["snack", "crunchy"])
    if any(w in q for w in ("eco", "green", "biodegradable")):
        tags.extend(["eco", "biodegradable"])
    if tags:
        raw["tags"] = tags

    # Stopwords cleanup for remaining search keywords
    stop = {
        "show", "me", "find", "get", "i", "want", "a", "an", "the", "some", "for", "with", "and", "in",
        "of", "to", "or", "something", "looking", "need", "best", "good", "cheapest", "cheap", "affordable",
        "budget", "expensive", "premium", "priciest", "products", "product", "items", "item"
    }
    words = [w for w in re.findall(r"[a-z0-9]+", q) if w not in stop and not w.isdigit()]
    if words and not raw.get("search"):
        raw["search"] = " ".join(words[:4])

    reasoning = "Searching for " + (" ".join(reasoning_parts) if reasoning_parts else f'items matching "{query}"')
    return raw, reasoning


def parse_search_query(
    query: str, categories: list[str], brands: list[str], available_tags: list[str] | None = None
) -> dict:
    """Turn conversational, problem-oriented queries into high-precision catalog filters."""
    # Check cache first for instant sub-5ms response on repeated queries
    norm_query = " ".join(query.strip().lower().split())
    cache_key = f"ai:search:{hashlib.md5(norm_query.encode()).hexdigest()}"
    cached = cache.get(cache_key)
    if cached is not None:
        return dict(cached)

    tags_context = (available_tags or [])[:40]

    system = (
        "You are an expert e-commerce search intelligence system for a retail product catalog. "
        "Your task is to translate natural-language shopper requests (problems, lifestyle needs, or queries) "
        "into structured catalog filters.\n\n"
        f"CATALOG TAXONOMY:\n"
        f"- Categories: {json.dumps(categories)}\n"
        f"- Brands: {json.dumps(brands)}\n"
        f"- Known Tags: {json.dumps(tags_context)}\n\n"
        "RULES FOR EXTRACTION:\n"
        "1. category: Pick the single best category strictly from the list if the problem or item falls under it; otherwise null.\n"
        "2. brand: Pick from the brand list ONLY if explicitly mentioned or strongly implied; otherwise null.\n"
        "3. search: 1 to 3 clean, canonical product keywords (e.g. 'dish soap', 'energy drink', 'shampoo'). "
        "NEVER include conversational filler ('something for', 'products'). Leave null if category and tags cover it.\n"
        "4. tags: Array of 1 to 3 relevant tags matching catalog tags or concepts (e.g. ['energy', 'caffeine']).\n"
        "5. exclude: Array of excluded ingredients/terms if user expressed negation (e.g. 'without sugar' -> ['sugar']).\n"
        "6. min_price, max_price: Numbers in INR if mentioned.\n"
        "7. ordering: 'price' for cheapest/budget, '-price' for expensive/premium, 'name', or null.\n"
        "8. reasoning: A concise, friendly 1-sentence explanation of what you searched for.\n\n"
        "Return ONLY JSON: {\"category\": str|null, \"brand\": str|null, \"search\": str|null, "
        "\"tags\": list[str]|null, \"exclude\": list[str]|null, \"min_price\": num|null, "
        "\"max_price\": num|null, \"ordering\": str|null, \"reasoning\": str}"
    )

    prompt = f"Shopper Request: {query!r}"

    try:
        raw_text = _call_gemini(prompt, system=system, json_mode=True, temperature=0.0)
        parsed = _parse_json(raw_text)
        if isinstance(parsed, dict):
            filters = _sanitize_filters(parsed, categories, brands)
            reasoning = str(parsed.get("reasoning") or "").strip()
            if not reasoning:
                parts = [f"{k}: {v}" for k, v in filters.items()]
                reasoning = f"Understood as {', '.join(parts)}" if parts else "Showing all matching catalog products."
            result = {"filters": filters, "reasoning": reasoning, "source": "llm"}
            cache.set(cache_key, result, timeout=3600)  # Cache for 1 hour
            return result
    except (LLMError, ValueError, TypeError) as e:
        logger.warning("LLM search failed (%s), using rule-based fallback", e)

    fallback_raw, fallback_reasoning = _rule_based_filters(query, categories, brands)
    result = {
        "filters": _sanitize_filters(fallback_raw, categories, brands),
        "reasoning": fallback_reasoning,
        "source": "fallback",
    }
    cache.set(cache_key, result, timeout=3600)
    return result
