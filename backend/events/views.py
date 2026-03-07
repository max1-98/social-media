# Django imports
from django.shortcuts import get_object_or_404

# rest_framework imports
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, generics
from rest_framework.status import HTTP_200_OK

from .serializers import ActivateMemberSerializer, DeactivateMemberSerializer, CompleteEventSerializer, StartEventSerializer
from .serializers import EventSerializer, EventDetailSerializer, EventSettingsSerializer, EventStatsSerializer, EventCreateSerializer
from .models import Event
from clubs.permissions import IsClubAdmin, IsClubMember
from clubs.models import ClubModel
from .fetch_events import get_events_for_user
from .services import create_event, auto_manage_events


class ActiveEventsView(generics.ListAPIView):

    queryset = Event.objects.all() 
    serializer_class = EventSerializer  
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        return Response(
            {"detail": "This endpoint is deprecated and not implemented."},
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )

class ActivateMemberView(APIView):

    """
    Update this so that people can activate/deactive themselves
    """
    permission_classes = [IsAuthenticated, IsClubAdmin]

    def post(self, request):
        serializer = ActivateMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save() 
        return Response(result, status=status.HTTP_200_OK)
    
class DectivateMemberView(APIView):
    """
    Update this so that people can activate/deactive themselves
    """
    permission_classes = [IsAuthenticated, IsClubAdmin]

    def post(self, request):
        serializer = DeactivateMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save() 
        return Response(result, status=status.HTTP_200_OK)

class EventView(APIView):
    permission_classes = [IsAuthenticated, IsClubMember]

    def get_object(self, pk1):
        try:

            return Event.objects.get(pk=pk1)
        except Event.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    def get(self, request, pk1): 
        event = self.get_object(pk1)
        if event:
            serializer = EventDetailSerializer(event)
            return Response(serializer.data)
        else:
            return Response(status=status.HTTP_404_NOT_FOUND)

class EventCreateView(APIView):
    queryset = Event.objects.all()
    permission_classes = [IsAuthenticated, IsClubAdmin]
    
    def post(self, request, pk):
        serializer = EventCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        club = get_object_or_404(ClubModel, pk=pk)
        game_type_name = request.data.get('game_type')
        event = create_event(club, game_type_name, serializer.validated_data)

        return Response(EventSerializer(event).data, status=status.HTTP_201_CREATED)
    
class EventSettingsUpdateView(generics.UpdateAPIView):
    """
    View to update event settings.
    """
    permission_classes = [IsAuthenticated, IsClubAdmin]
    serializer_class = EventSettingsSerializer

    def update(self, request, *args, **kwargs):
        event_id = kwargs.get('pk1')
        event = get_object_or_404(Event, pk=event_id)

        serializer = self.get_serializer(event, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EventStatsView(APIView):

    permission_classes = [IsAuthenticated, IsClubMember]

    def get(self, request, pk1):
        event = get_object_or_404(Event, pk=pk1)
        serializer = EventStatsSerializer(event)
        return Response(serializer.data, status=HTTP_200_OK)

class EventsListView(generics.ListAPIView):
    queryset = Event.objects.all() 
    serializer_class = EventSerializer  
    permission_classes = [IsAuthenticated, IsClubMember]

    def get_queryset(self):
        club_id = self.kwargs['pk']
        club = get_object_or_404(ClubModel, pk=club_id)
        return club.events.all()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        auto_manage_events(queryset)

        # Re-fetch after auto_manage_events may have deleted some events
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
class CompleteEventView(APIView):
    
    permission_classes = [IsAuthenticated, IsClubAdmin]

    def post(self, request):
        """
        Reverses the status of the event: 
            complete -> incomplete
            incomplete -> complete
        """

        serializer = CompleteEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save() 
        return Response(result, status=status.HTTP_200_OK)

class StartEventView(APIView):
    permission_classes = [IsAuthenticated, IsClubAdmin]

    def post(self, request):
        serializer = StartEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save() 
        return Response(result, status=status.HTTP_200_OK)

class MyEventsView(generics.ListAPIView):

    queryset = Event.objects.all() 
    serializer_class = EventSerializer  
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        
        return get_events_for_user(self.request.user)
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        return Response(serializer.data)
