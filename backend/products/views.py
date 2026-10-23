import logging

from django.db.models import Max, Min
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .filters import ProductFilter
from .models import Product
from .permissions import IsOwnerOrReadOnly
from .serializers import ProductSerializer

logger = logging.getLogger(__name__)


class ProductViewSet(viewsets.ModelViewSet):
    """
    CRUD for products.

    * **Search:** `?search=` (name, brand, category, description)
    * **Filter:** `?category=&brand=&min_price=&max_price=&mine=true`
    * **Sort:** `?ordering=price` / `-price` / `name` / `-created_at`
    * **Paginate:** `?page=2&page_size=12`
    """

    queryset = Product.objects.select_related("owner")
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    filterset_class = ProductFilter
    search_fields = ["name", "brand", "category", "description"]
    ordering_fields = ["price", "name", "created_at"]
    ordering = ["-created_at"]

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
        qs = Product.objects.all()
        bounds = qs.aggregate(min=Min("price"), max=Max("price"))
        return Response(
            {
                "categories": sorted(qs.values_list("category", flat=True).distinct(), key=str.lower),
                "brands": sorted(qs.values_list("brand", flat=True).distinct(), key=str.lower),
                "price_min": bounds["min"],
                "price_max": bounds["max"],
            }
        )
