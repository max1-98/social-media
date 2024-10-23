# Django-REST imports
from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

# Django imports
from django.shortcuts import get_object_or_404

# Local imports
from .models import Elo
from accounts.models import CustomUser
from .serializers import EloSerializer

class EloListView(generics.ListAPIView):
    """
    List all Elo entries for a specific user.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = EloSerializer

    def get_queryset(self):
        username = self.kwargs.get('username')
        user = get_object_or_404(CustomUser, username=username)
        return user.elos.all()
    