from rest_framework import generics, permissions
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    """Create an account and receive JWT tokens immediately."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"


class LoginView(TokenObtainPairView):
    """Exchange username + password for access/refresh tokens."""

    serializer_class = LoginSerializer
    throttle_scope = "auth"


class MeView(generics.RetrieveAPIView):
    """The currently authenticated user."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
