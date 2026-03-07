from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from clubs.models import ClubModel
from clubs.permissions import IsClubAdmin
from backend.settings import GOOGLE_API_KEY

import googlemaps


class AddressToLngLatView(APIView):

    permission_classes = [IsAuthenticated, IsClubAdmin]

    def post(self, request):
        gmaps = googlemaps.Client(key=GOOGLE_API_KEY)
        address = request.data.get('address')
        club_id = request.data.get('club_id')

        if not address or not club_id:
            return Response({"error": "Address is required"}, status=400)

        club = get_object_or_404(ClubModel, pk=club_id)

        try:
            info = gmaps.geocode(address)[0]
            lat_lng = info["geometry"]["location"]
            formatted_address = info["formatted_address"]

            club.coordinates = lat_lng
            club.address = formatted_address
            club.save()

            return Response({"lat_lng": lat_lng, "address": address, "formatted_address": formatted_address})

        except IndexError:
            return Response({"error": "Invalid address"}, status=400)
        except Exception as e:
            return Response({"error": f"An error occurred: {e}"}, status=500)
