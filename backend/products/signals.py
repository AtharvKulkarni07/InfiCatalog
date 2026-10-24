import logging
from django.core.cache import cache
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Product

logger = logging.getLogger(__name__)


@receiver([post_save, post_delete], sender=Product)
def invalidate_catalog_facets(sender, **kwargs):
    """Automatically invalidate catalog facet cache whenever a product is created, edited, or deleted."""
    try:
        if hasattr(cache, "delete_pattern"):
            cache.delete_pattern("catalog:facets:*")
            logger.debug("Invalidated Redis facet cache keys: catalog:facets:*")
        else:
            cache.clear()
    except Exception as exc:
        logger.warning("Failed to invalidate facet cache: %s", exc)
