from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    confirm_password = serializers.CharField(
        write_only=True, required=False, style={"input_type": "password"}
    )
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "confirm_password"]

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value.lower()

    def validate(self, attrs):
        confirm = attrs.get("confirm_password")
        if confirm and confirm != attrs.get("password"):
            raise serializers.ValidationError({"confirm_password": ["Passwords do not match."]})

        probe = User(username=attrs.get("username"), email=attrs.get("email"))
        try:
            validate_password(attrs["password"], user=probe)
        except Exception as exc:  # DjangoValidationError -> field error
            raise serializers.ValidationError({"password": list(getattr(exc, "messages", [str(exc)]))})
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password", None)
        return User.objects.create_user(**validated_data)

    def to_representation(self, instance):
        refresh = RefreshToken.for_user(instance)
        return {
            "user": UserSerializer(instance).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }


class LoginSerializer(TokenObtainPairSerializer):
    """Returns the user profile alongside the token pair."""

    def validate(self, attrs):
        raw_username = attrs.get(self.username_field, "").strip()
        if raw_username:
            matched_user = User.objects.filter(
                Q(username__iexact=raw_username) | Q(email__iexact=raw_username)
            ).first()
            if matched_user:
                attrs[self.username_field] = matched_user.get_username()

        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data
