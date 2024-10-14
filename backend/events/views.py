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
from .serializers import EventSerializer, EventDetailSerializer
from .models import Event
from clubs.models import ClubModel 

class ActivateMemberView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ActivateMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save() 
        return Response(result, status=status.HTTP_200_OK)
    
class DectivateMemberView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DeactivateMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save() 
        return Response(result, status=status.HTTP_200_OK)

class CompleteEventView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CompleteEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save() 
        return Response(result, status=status.HTTP_200_OK)

class StartEventView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = StartEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save() 
        return Response(result, status=status.HTTP_200_OK)
    
class EventView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    def get(self, request, pk):  # Include 'pk'
        event = self.get_object(pk)
        if event:
            serializer = EventDetailSerializer(event)
            return Response(serializer.data)
        else:
            return Response(status=status.HTTP_404_NOT_FOUND)

class EventCreateView(APIView):
    queryset = Event.objects.all()
    
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
        
class EventsListView(generics.ListAPIView):
    queryset = Event.objects.all() 
    serializer_class = EventSerializer  
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        club_id = self.kwargs['pk']
        club = get_object_or_404(ClubModel, pk=club_id)
        return Event.objects.filter(club=club)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        return Response(serializer.data)