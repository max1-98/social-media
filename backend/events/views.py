from django.shortcuts import render

from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404

# rest_framework imports
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, generics

# Create your views here.
from .serializers import ActivateMemberSerializer, DeactivateMemberSerializer, CompleteEventSerializer, StartEventSerializer
from .serializers import EventSerializer, EventDetailSerializer, EventSettingsSerializer, EventStatsSerializer
from .models import Event
from clubs.permissions import IsClubAdmin, IsClubMember
from clubs.models import ClubModel 
from .fetch_events import get_upcoming_events_for_user, get_active_events_for_user


class ActiveEventsView(generics.ListAPIView):

    queryset = Event.objects.all() 
    serializer_class = EventSerializer  
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        
        return get_active_events_for_user(self.request.user)
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        return Response(serializer.data)

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
        """
        Override to set the user field automatically.
        """
        
        serializer = EventSerializer(data=request.data)
         

        if serializer.is_valid():
            club_id = pk
            club = ClubModel.objects.get(pk=club_id)
            event = serializer.save(club=club)
            serialized_event = EventSerializer(event)
            return Response(serialized_event.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EventSettingsUpdateView(generics.UpdateAPIView):
    """
    View to update event settings.
    """
    permission_classes = [IsAuthenticated, IsClubAdmin]
    serializer_class = EventSettingsSerializer

    def update(self, request, *args, **kwargs):
        event_id = kwargs.get('pk1')
        event = get_object_or_404(Event, pk=event_id)

        print(request.data)
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
        return Response(serializer.data, status=status.HTTP_200_OK)

class EventsListView(generics.ListAPIView):
    queryset = Event.objects.all() 
    serializer_class = EventSerializer  
    permission_classes = [IsAuthenticated, IsClubMember]

    def get_queryset(self):
        club_id = self.kwargs['pk']
        club = get_object_or_404(ClubModel, pk=club_id)
        return Event.objects.filter(club=club)

    def list(self, request, *args, **kwargs):
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

class UpcomingEventView(generics.ListAPIView):

    queryset = Event.objects.all() 
    serializer_class = EventSerializer  
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        
        return get_upcoming_events_for_user(self.request.user)
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        return Response(serializer.data)
