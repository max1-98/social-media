from rest_framework.permissions import BasePermission
from .models import ClubModel

class IsClubAccessible(BasePermission):
    def has_object_permission(self, request, view, obj):
        # Here, 'obj' represents the ClubModel instance being accessed

        # Example: Allow anyone to view clubs
        return True