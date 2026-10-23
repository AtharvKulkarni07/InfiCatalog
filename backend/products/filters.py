import django_filters
from django.db.models import Q

from .models import Product


class ProductFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name="category", lookup_expr="iexact")
    brand = django_filters.CharFilter(field_name="brand", lookup_expr="iexact")
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    mine = django_filters.BooleanFilter(method="filter_mine", label="Only my products")
    tags = django_filters.CharFilter(method="filter_tags", label="Filter by tags (comma-separated, matches any)")
    exclude = django_filters.CharFilter(method="filter_exclude", label="Exclude keywords (comma-separated)")

    class Meta:
        model = Product
        fields = ["category", "brand", "min_price", "max_price", "mine", "tags", "exclude"]

    def filter_mine(self, queryset, name, value):
        user = self.request.user
        if value and user.is_authenticated:
            return queryset.filter(owner=user)
        return queryset

    def filter_tags(self, queryset, name, value):
        if not value:
            return queryset
        tag_list = [t.strip().lower() for t in value.split(",") if t.strip()]
        if not tag_list:
            return queryset
        q_obj = Q()
        for t in tag_list:
            q_obj |= Q(tags__icontains=t) | Q(name__icontains=t) | Q(description__icontains=t)
        return queryset.filter(q_obj).distinct()

    def filter_exclude(self, queryset, name, value):
        if not value:
            return queryset
        exclude_list = [t.strip().lower() for t in value.split(",") if t.strip()]
        for term in exclude_list:
            ex_q = Q(name__icontains=term) | Q(description__icontains=term) | Q(tags__icontains=term)
            safe_q = (
                Q(name__icontains=f"zero {term}")
                | Q(name__icontains=f"{term}-free")
                | Q(name__icontains=f"no {term}")
                | Q(tags__icontains=f"zero {term}")
                | Q(tags__icontains=f"{term}-free")
                | Q(tags__icontains=f"no {term}")
            )
            queryset = queryset.exclude(ex_q & ~safe_q)
        return queryset
