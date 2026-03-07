from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from clubs.models import ClubModel, Sport
from clubs.serializers import SportSerializer


class AddSport(APIView):
    """
    This view will handle adding a club sport, e.g., tennis, badminton.
    """

    def get(self, request, format=None):
        """
        Return a list of all sports (names only).
        """
        sports = Sport.objects.all()
        serializer = SportSerializer(sports, many=True)
        return Response(serializer.data)

    def post(self, request, format=None):
        """
        Add a sport to a club.  Accepts sport name and club ID.
        """
        sport_name = request.data.get('sport_name')
        club_id = request.data.get('club_id')

        if not sport_name or not club_id:
            return Response({'error': 'Sport name and club ID are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            club = ClubModel.objects.get(pk=club_id)
        except ClubModel.DoesNotExist:
            return Response({'error': 'Club not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            sport = Sport.objects.get(name=sport_name)
        except Sport.DoesNotExist:
            return Response({'error': 'Sport not found.'}, status=status.HTTP_404_NOT_FOUND)

        if club.sport_type:
            sport_old = club.sport_type
            sport_old.clubs.remove(club)

        club.sport_type = sport
        club.save()
        sport.clubs.add(club)
        sport.save()

        return Response({'message': 'Sport added to club successfully.'}, status=status.HTTP_201_CREATED)
