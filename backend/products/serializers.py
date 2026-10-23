from rest_framework import serializers

from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True, default=None)
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "brand", "category", "description", "price", "image_url",
            "tags", "owner_username", "is_owner", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_is_owner(self, obj) -> bool:
        request = self.context.get("request")
        return bool(
            request
            and request.user.is_authenticated
            and (obj.owner_id == request.user.id or request.user.is_staff or request.user.is_superuser)
        )

    @staticmethod
    def _clean_text(value, label):
        value = " ".join((value or "").split())
        if not value:
            raise serializers.ValidationError(f"{label} cannot be blank.")
        return value

    def validate_name(self, value):
        return self._clean_text(value, "Product name")

    def validate_brand(self, value):
        return self._clean_text(value, "Brand")

    def validate_category(self, value):
        return self._clean_text(value, "Category")

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    def validate_tags(self, value):
        if not isinstance(value, list) or not all(isinstance(t, str) for t in value):
            raise serializers.ValidationError("Tags must be a list of strings.")
        cleaned = []
        for tag in value:
            tag = tag.strip().lower()[:30]
            if tag and tag not in cleaned:
                cleaned.append(tag)
        if len(cleaned) > 10:
            raise serializers.ValidationError("Use at most 10 tags.")
        return cleaned
