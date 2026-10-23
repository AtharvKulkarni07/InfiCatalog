"""GenAI features for the catalog, built on Google Gemini's REST API.

Design: every feature has a deterministic fallback, so the product never breaks when the LLM key is
missing, rate limited, or returns garbage. Responses say which path produced them via `source`.
"""
import json
import logging
import re

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

SEARCH_KEYS = {"search", "category", "brand", "min_price", "max_price", "ordering"}
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
    """Never trust model output: whitelist keys, coerce types, and match values to real catalog values."""
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
    search = " ".join(str(raw.get("search") or "").split())[:100]
    if search:
        out["search"] = search
    if raw.get("ordering") in ALLOWED_ORDERING:
        out["ordering"] = raw["ordering"]
    return out


def _rule_based_filters(query: str, categories: list[str], brands: list[str]) -> dict:
    q = query.lower()
    raw = {}
    for c in categories:
        if c.lower() in q:
            raw["category"] = c
            q = q.replace(c.lower(), " ")
    for b in brands:
        if b.lower() in q:
            raw["brand"] = b
            q = q.replace(b.lower(), " ")
    num = r"(?:rs\.?|inr|₹)?\s*(\d[\d,]*(?:\.\d+)?)"
    if m := re.search(rf"(?:under|below|less than|cheaper than|max|upto|up to)\s*{num}", q):
        raw["max_price"] = float(m.group(1).replace(",", ""))
        q = q.replace(m.group(0), " ")
    if m := re.search(rf"(?:over|above|more than|at least|min)\s*{num}", q):
        raw["min_price"] = float(m.group(1).replace(",", ""))
        q = q.replace(m.group(0), " ")
    if re.search(r"\b(cheapest|cheap|affordable|budget)\b", q):
        raw["ordering"] = "price"
    elif re.search(r"\b(expensive|premium|priciest)\b", q):
        raw["ordering"] = "-price"
    stop = {"show", "me", "find", "get", "i", "want", "a", "an", "the", "some", "for", "with", "and", "in",
            "cheapest", "cheap", "affordable", "budget", "expensive", "premium", "priciest", "products", "product"}
    words = [w for w in re.findall(r"[a-z0-9]+", q) if w not in stop and not w.isdigit()]
    raw["search"] = " ".join(words)
    return raw


def parse_search_query(query: str, categories: list[str], brands: list[str]) -> dict:
    """Turn 'cheap protein snacks under 500' into structured catalog filters."""
    system = (
        "You convert a shopper's natural-language request into catalog filters. Prices are in INR. "
        "Use ONLY categories and brands from the provided lists, otherwise leave them null. "
        "Put leftover product keywords in `search`. Use `ordering` only if the user implies sorting."
    )
    prompt = (
        f"Categories: {json.dumps(categories)}\nBrands: {json.dumps(brands)}\n"
        f"Request: {query!r}\n"
        'Return ONLY JSON: {"search": string|null, "category": string|null, "brand": string|null, '
        '"min_price": number|null, "max_price": number|null, '
        '"ordering": "price"|"-price"|"name"|"-created_at"|null}'
    )
    try:
        parsed = _parse_json(_call_gemini(prompt, system=system, json_mode=True, temperature=0.0))
        if isinstance(parsed, dict):
            return {"filters": _sanitize_filters(parsed, categories, brands), "source": "llm"}
    except (LLMError, ValueError, TypeError):
        pass
    return {"filters": _sanitize_filters(_rule_based_filters(query, categories, brands), categories, brands),
            "source": "fallback"}
