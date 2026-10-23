from rest_framework import serializers


class DescriptionRequestSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    brand = serializers.CharField(max_length=100)
    category = serializers.CharField(max_length=100)
    tone = serializers.ChoiceField(choices=["friendly", "professional", "playful"], default="friendly")


class TagsRequestSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    brand = serializers.CharField(max_length=100)
    category = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_blank=True, max_length=2000, default="")


class SearchRequestSerializer(serializers.Serializer):
    query = serializers.CharField(max_length=200)
