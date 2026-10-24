import logging
import os

from django.contrib.auth import get_user_model
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer

logger = logging.getLogger(__name__)
User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Create an account and receive JWT tokens immediately."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def perform_create(self, serializer):
        user = serializer.save()
        logger.info("New user registered: %s (%s)", user.username, user.email)


class LoginView(TokenObtainPairView):
    """Exchange username/email + password for access/refresh tokens."""

    serializer_class = LoginSerializer
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        res = super().post(request, *args, **kwargs)
        if res.status_code == 200:
            user_data = res.data.get("user", {})
            logger.info("Successful login for user '%s' (id: %s)", user_data.get("username"), user_data.get("id"))
        else:
            logger.warning("Failed login attempt for identifier '%s'", request.data.get("username"))
        return res


class MeView(generics.RetrieveAPIView):
    """The currently authenticated user."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class PasswordResetRequestView(APIView):
    """Request a password reset email. Always returns 200 to avoid email enumeration."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if email:
            user = User.objects.filter(email__iexact=email).first()
            if user:
                from django.conf import settings
                from django.contrib.auth.tokens import default_token_generator
                from django.core.mail import send_mail
                from django.utils.encoding import force_bytes
                from django.utils.http import urlsafe_base64_encode

                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)

                origin = request.META.get("HTTP_ORIGIN")
                if not origin or ":8000" in origin:
                    origin = os.getenv("FRONTEND_URL", "http://localhost:5173")
                reset_link = f"{origin.rstrip('/')}/reset-password/{uid}/{token}"

                subject = "InfiCatalog — Reset Your Password"
                body = (
                    f"Hello {user.username},\n\n"
                    f"You requested to reset your password for InfiCatalog.\n\n"
                    f"Please click the link below to set a new password:\n{reset_link}\n\n"
                    f"If you did not request this, you can safely ignore this email.\n\n"
                    f"Best regards,\nThe InfiCatalog Team"
                )

                try:
                    send_mail(
                        subject=subject,
                        message=body,
                        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                        recipient_list=[user.email],
                        fail_silently=False,
                    )
                    logger.info("Password reset email sent to %s via SMTP", user.email)
                except Exception as exc:
                    logger.warning(
                        "Could not send email to %s (error: %s). Direct reset link: %s",
                        user.email, exc, reset_link,
                    )
        return Response({"detail": "If an account with that email exists, a reset link has been sent."})


class PasswordResetConfirmView(APIView):
    """Confirm a password reset with uid, token, and new password."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        from django.contrib.auth.password_validation import validate_password
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_str
        from django.utils.http import urlsafe_base64_decode

        uidb64 = request.data.get("uid")
        token = request.data.get("token")
        new_password = (request.data.get("new_password") or "").strip()

        if not uidb64 or not token or not new_password:
            return Response({"detail": "Missing required fields."}, status=400)

        if len(new_password) < 8:
            return Response({"detail": "Password must be at least 8 characters long."}, status=400)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"detail": "Invalid reset link or account does not exist."}, status=400)

        if not default_token_generator.check_token(user, token):
            return Response({"detail": "The reset link is invalid or has expired. Please request a new one."}, status=400)

        try:
            validate_password(new_password, user)
        except Exception as e:
            err_msg = e.messages[0] if hasattr(e, "messages") and e.messages else str(e)
            return Response({"detail": err_msg}, status=400)

        user.set_password(new_password)
        user.save()
        logger.info("Password successfully reset for %s", user.username)
        return Response({"detail": "Password has been successfully reset. You can now sign in with your new password."})

