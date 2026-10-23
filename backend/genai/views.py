import logging

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product

from . import services
from .serializers import DescriptionRequestSerializer, SearchRequestSerializer, TagsRequestSerializer

logger = logging.getLogger(__name__)


class GenerateDescriptionView(APIView):
    """Draft a product description from name, brand and category."""

    permission_classes = [IsAuthenticated]
    throttle_scope = "ai"

    @extend_schema(request=DescriptionRequestSerializer, responses={200: dict})
    def post(self, request):
        s = DescriptionRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        result = services.generate_description(**s.validated_data)
        logger.info("AI description via %s for user %s", result["source"], request.user.username)
        return Response(result)


class SuggestTagsView(APIView):
    """Suggest search tags for a product."""

    permission_classes = [IsAuthenticated]
    throttle_scope = "ai"

    @extend_schema(request=TagsRequestSerializer, responses={200: dict})
    def post(self, request):
        s = TagsRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(services.suggest_tags(**s.validated_data))


class NaturalLanguageSearchView(APIView):
    """Translate a plain-English query into the filters understood by GET /api/products/."""

    permission_classes = [AllowAny]
    throttle_scope = "ai"

    @extend_schema(request=SearchRequestSerializer, responses={200: dict})
    def post(self, request):
        s = SearchRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        categories = list(Product.objects.values_list("category", flat=True).distinct())
        brands = list(Product.objects.values_list("brand", flat=True).distinct())
        all_tags = set()
        for t_list in Product.objects.values_list("tags", flat=True):
            if isinstance(t_list, list):
                all_tags.update(t_list)
        result = services.parse_search_query(
            s.validated_data["query"], categories, brands, sorted(list(all_tags))
        )
        logger.info("AI search %r -> %s (%s)", s.validated_data["query"], result["filters"], result["source"])
        return Response(result)
