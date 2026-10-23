from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Anyone can read; creator or staff/admin can modify or delete."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user.is_authenticated
            and (obj.owner_id == request.user.id or request.user.is_staff or request.user.is_superuser)
        )
