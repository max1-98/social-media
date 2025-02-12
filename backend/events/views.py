# Django imports
from django.shortcuts import render
from django.utils import timezone
#from django.utils.cache import cache
from django.utils.timezone import now
from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404

# rest_framework imports
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, generics
from rest_framework.status import HTTP_200_OK

# Create your views here.
from .serializers import ActivateMemberSerializer, DeactivateMemberSerializer, CompleteEventSerializer, StartEventSerializer
from .serializers import EventSerializer, EventDetailSerializer, EventSettingsSerializer, EventStatsSerializer, EventCreateSerializer
from .models import Event
from games.models import GameType
from clubs.permissions import IsClubAdmin, IsClubMember
from clubs.models import ClubModel, ClubStatus 
from .fetch_events import get_events_for_user, get_active_events_for_user, get_recent_event_date
from backend.utils import string_to_date, is_more_than_four_weeks_ago


class ActiveEventsView(generics.ListAPIView):

    queryset = Event.objects.all() 
    serializer_class = EventSerializer  
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        get_active_events_for_user(self.request.user)
        ### This will throw up an error, this view was expected to be redundant but in case there is use
        ### We have left it here
        return 1/0
    
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
        
        game_type_name = request.data.get('game_type') # Get game_type from request data

        serializer = EventCreateSerializer(data=request.data)
        game_type = get_object_or_404(GameType, name=game_type_name)
        

        if serializer.is_valid():
            club_id = pk
            club = ClubModel.objects.get(pk=club_id)
            event = serializer.save(club=club)
            event.game_type = game_type
            event.save()
            club.events.add(event)

            # Add functionality to create active and inactive model for ClubStatus, but is this necessarily needed? 
            # Perhaps we could add a field to clubs 0 for inactive, 1 for inactive then use a filter
            """
            Advantages of the change:
                - Cleaner
                - No extra tables needed
                - Filter is equally if not more efficient
    
            """
            """
            active_model = ClubStatus.objects.get(pk=1)
            if club.is_active:
                
                event_data = active_model.event_dates

                #Check that it is a dictionary first before attempting to access it.
                if isinstance(event_data, dict):
                    date_str = event_data.get(str(club_id))
                    date = string_to_date(date_str)

                    # Checks whether date comes before event.date, if so update the dict, otherwise don't
                    if date is None or date < event.date:
                        
                        active_model.event_dates[str(club_id)] = str(event.date)
                    
                else:
                    # if the dictionary does not exist then create a new dict
                    active_model.event_dates = {str(club_id): str(event.date)} # Convert to string
            else:
                # if the club was previously inactive then automatically add the club to the dict
                if isinstance(event_data, dict):
                    active_model.event_dates[str(pk)] = str(event.date)
                else:
                    active_model.event_dates = {str(pk): str(event.date)}

            active_model.save()
            """
            club.save()
            serialized_event = EventSerializer(event)
            return Response(serialized_event.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class EventDeleteView(APIView):
    # Logic for deleting Event's
    """
    Fetch the event using pk1
    Delete the event, will this automatically remove it from the ManyToMany field in the ClubModel? I'm guessing it would
    Make it so Event's can't be deleted after completion
    Likewise make it so Clubs can't be deleted if there have been events. 
    Furthermore make it impossible for a User to delete themselves rather they get reset to a DummyUser
    """

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
        cache_key = f"event_stats_{pk1}"  # Unique cache key based on event pk
        #cached_data = cache.get(cache_key)
        cached_data = 0
        if cached_data:
            # If data is in cache, return it
            return Response(cached_data, status=HTTP_200_OK)

        # If data is not in cache, fetch it and serialize
        event = get_object_or_404(Event, pk=pk1)
        serializer = EventStatsSerializer(event)
        serialized_data = serializer.data

        # Cache the serialized data for 24 hours
        #cache.set(cache_key, serialized_data, timeout=24 * 60 * 60)

        return Response(serialized_data, status=HTTP_200_OK)

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

        for event in queryset:

            if not event.event_active and event.date < timezone.now().date():
                start_datetime = timezone.datetime.combine(timezone.now().date(), event.start_time).astimezone()
                if start_datetime < timezone.now():
                    event.event_active=True
                    event.save()
                
            if not event.event_complete:
                if event.date + timezone.timedelta(days=2) < timezone.now().date():
                    # Event has passed the 3-hour deadline
                    event.event_complete = True
                    event.save()

            if event.event_complete and event.date + timezone.timedelta(days=2) < timezone.now().date():
                # Event is complete and active
                if event.games.count() == 0:

                    # No games played, delete the event
                    club = event.club 
                    date_event = event.date
                    event.delete()
                    
                    get_recent_event_date(club)
                    active_model = ClubStatus.objects.get(pk=1)

                    event_data = active_model.event_dates
                    club_id=club.id

                    #Check that it is a dictionary first before attempting to access it.
                    if isinstance(event_data, dict):
                        date_str = event_data.get(str(club_id))
                        date = string_to_date(date_str)

                        # Checks whether date comes before or at the same time event.date, hence we need to find the actual date
                        if date is None or date <= date_event:
                            most_recent_event = get_recent_event_date(club)

                            if not most_recent_event or is_more_than_four_weeks_ago(most_recent_event):
                                club.is_active = False
                                active_model.event_dates.pop(str(club_id), None)
                                club.save()
                            else:
                                active_model.event_dates[(str(club_id))] = str(most_recent_event)
                                
                            active_model.save()
                        # Else we don't need to do anything as the current date is younger than the event we just deleted
                    # the dictionary will exist or be empty as long as soon as the app has been
                    

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
