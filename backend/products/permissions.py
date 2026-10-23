from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Anyone can read; only the creator can modify or delete."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.owner_id == request.user.id
