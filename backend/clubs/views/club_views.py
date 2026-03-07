from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, generics
from rest_framework.parsers import FormParser, MultiPartParser

from clubs.models import ClubModel, Member, Sport
from clubs.serializers import (
    ClubSerializer, ClubImageSerializer, ManyClubSerializer, MyClubSerializer,
)
from clubs.permissions import IsClubAdmin
from clubs.services import create_club


class AllClubView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None, *args, **kwargs):
        southwest_lat = request.GET.get('southwest_lat')
        southwest_lng = request.GET.get('southwest_lng')
        northeast_lat = request.GET.get('northeast_lat')
        northeast_lng = request.GET.get('northeast_lng')

        sport_name = kwargs.get('sport')

        if sport_name:
            try:
                sport_model = Sport.objects.get(name=sport_name)
                clubs = ClubModel.objects.filter(sport_type=sport_model)
            except Sport.DoesNotExist:
                return Response({"error": "Sport not found"}, status=404)
        else:
            clubs = ClubModel.objects.all()

        filtered_clubs = []
        if southwest_lat and southwest_lng and northeast_lat and northeast_lng:
            for club in clubs:
                if club.coordinates:
                    coords = club.coordinates
                    lat = coords['lat']
                    lng = coords['lng']

                    if (float(southwest_lat) <= float(lat) <= float(northeast_lat) and
                            float(southwest_lng) <= float(lng) <= float(northeast_lng)):
                        filtered_clubs.append(club)

            serializer = ManyClubSerializer(filtered_clubs, many=True)
            return Response(serializer.data)

        serializer = ManyClubSerializer(clubs, many=True)
        return Response(serializer.data)


class ClubDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return ClubModel.objects.get(pk=pk)
        except ClubModel.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    def get(self, request, pk):
        club = self.get_object(pk)
        user = request.user
        if user:
            serializer = ClubSerializer(club, context={'user': user})
            return Response(serializer.data)
        else:
            return Response(status=status.HTTP_401_UNAUTHORIZED)

    def delete(self, request, pk):
        club = self.get_object(pk)
        club.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ClubCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            club = create_club(
                user=request.user,
                club_username=request.data.get('club_username'),
                name=request.data.get('name'),
                info=request.data.get('info'),
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ClubSerializer(club)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ClubUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated, IsClubAdmin]
    queryset = ClubModel.objects.all()
    serializer_class = ClubSerializer


class ClubImageView(APIView):
    permission_classes = [IsAuthenticated, IsClubAdmin]
    parser_classes = (FormParser, MultiPartParser)

    def patch(self, request, pk):
        try:
            club = ClubModel.objects.get(pk=pk)
        except ClubModel.DoesNotExist:
            return Response({'error': 'Club not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ClubImageSerializer(club, data=request.data, partial=True)
        is_valid = serializer.is_valid()
        if not is_valid:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response({'message': 'Club logo updated successfully'}, status=status.HTTP_200_OK)


class MyClubsListView(generics.ListAPIView):
    """
    Lists all clubs the current user is a member of.
    """
    serializer_class = MyClubSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        memberships = user.memberships.all()
        clubs = []
        for membership in memberships:
            clubs.append(membership.club)
        return clubs
