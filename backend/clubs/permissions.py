from rest_framework.permissions import BasePermission
from .models import ClubModel, ClubAdmin, Member
from events.models import Event
from django.shortcuts import get_object_or_404

class IsClubMember(BasePermission):
    """
    Permission to check if the user is a member of a specific club.
    """

    def has_permission(self, request, view):
        """
        Check if the user has permission to access the view.

        This method is called for all requests.
        """
        # Get club ID from various sources
        club_id = request.data.get('club_id')  # Try POST data
        if not club_id:
            club_id = view.kwargs.get('pk')  # Try URL
        if not club_id:
            event_id = request.data.get('event_id')  # Try POST data for event_id
            if not event_id:
                event_id = view.kwargs.get('pk1')  # Try URL for event_id
            if event_id:
                event = get_object_or_404(Event, pk=event_id)
                club_id = event.club_id  # Assuming you have club_id in Event model
        if club_id:
            club = get_object_or_404(ClubModel, pk=club_id)  # Retrieve the club
            return Member.objects.filter(club=club, user=request.user).exists()
        return False 

    def has_object_permission(self, request, view, obj):
        """
        Check if the user has permission to access the object.

        This method is called for requests involving a specific object.
        """
        if isinstance(obj, ClubModel):
            return Member.objects.filter(club=obj, user=request.user).exists()
        return False
    
class IsClubAdmin(BasePermission):
    """
    Permission to check if the user is an administrator for a specific club.
    """

    def has_permission(self, request, view):
        """
        Check if the user has permission to access the view.

        This method is called for all requests.
        """
        club_id = request.data.get('club_id')  # Try POST data
        if not club_id:
            club_id = view.kwargs.get('pk')  # Try URL
        if not club_id:
            event_id = request.data.get('event_id')  # Try POST data for event_id
            if not event_id:
                event_id = view.kwargs.get('pk1')  # Try URL for event_id
            if event_id:
                event = get_object_or_404(Event, pk=event_id)
                club_id = event.club_id # Assuming you have club_id in Event model
        if club_id:
            club = get_object_or_404(ClubModel, pk=club_id)  # Retrieve the club
            return ClubAdmin.objects.filter(club=club, admin=request.user).exists()
        return False 


    def has_object_permission(self, request, view, obj):
        """
        Check if the user has permission to access the object.

        This method is called for requests involving a specific object.
        """
        if isinstance(obj, ClubModel):
            return ClubAdmin.objects.filter(club=obj, admin=request.user).exists()
        return False

class IsClubPresident(BasePermission):
    """
    Permission to check if the user is the president of a specific club.
    """

    def has_permission(self, request, view):
        """
        Check if the user has permission to access the view.

        This method is called for all requests.
        """
        # Get club ID from various sources
        club_id = request.data.get('club_id')  # Try POST data
        if not club_id:
            club_id = view.kwargs.get('pk')  # Try URL
        if not club_id:
            event_id = request.data.get('event_id')  # Try POST data for event_id
            if not event_id:
                event_id = view.kwargs.get('pk1')  # Try URL for event_id
            if event_id:
                event = get_object_or_404(Event, pk=event_id)
                club_id = event.club_id  # Assuming you have club_id in Event model
        if club_id:
            club = get_object_or_404(ClubModel, pk=club_id)  # Retrieve the club
            return club.president == request.user
        return False 

    def has_object_permission(self, request, view, obj):
        """
        Check if the user has permission to access the object.

        This method is called for requests involving a specific object.
        """
        if isinstance(obj, ClubModel):
            return obj.president == request.user
        return False