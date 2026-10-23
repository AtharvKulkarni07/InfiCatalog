import django_filters

from .models import Product


class ProductFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name="category", lookup_expr="iexact")
    brand = django_filters.CharFilter(field_name="brand", lookup_expr="iexact")
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    mine = django_filters.BooleanFilter(method="filter_mine", label="Only my products")

    class Meta:
        model = Product
        fields = ["category", "brand", "min_price", "max_price", "mine"]

    def filter_mine(self, queryset, name, value):
        user = self.request.user
        if value and user.is_authenticated:
            return queryset.filter(owner=user)
        return queryset
