from urllib.parse import urlparse, urlunparse

from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, generics
import validators

from clubs.models import ClubModel
from clubs.serializers import ClubSocialSerializer
from clubs.permissions import IsClubAdmin


def standardize_url(url):
    """Standardizes a URL to the format 'http://www.[url]'."""
    try:
        if not validators.url(url):
            if url[0:3] == "www":
                url = "http://" + url
                return standardize_url(url)
            return None

        parsed = urlparse(url)

        if not parsed.scheme:
            parsed = parsed._replace(scheme="http")

        if parsed.scheme != 'http':
            parsed = parsed._replace(scheme="http")

        netloc = parsed.netloc.rstrip("/")
        parsed = parsed._replace(netloc=netloc)

        if not netloc.startswith('www.'):
            if '.' in netloc:
                netloc = f"www.{netloc}"
            else:
                return None

        standardized_url = urlunparse(parsed)
        return standardized_url
    except (ValueError, TypeError):
        return None


def check_valid(url, site):
    url = standardize_url(url)

    if site == "website":
        return url
    elif site == "whatsapp":
        if "chat.whatsapp" in url:
            return url
    elif len(url) >= 11 + len(site) + 4 and url[11:11 + len(site) + 4] == site + ".com":
        return url

    return False


def platform_to_check(platform, socials):
    for social in socials:
        if social['platform'] == platform:
            return True
    return False


class UpdateClubSocials(APIView):
    permission_classes = [IsAuthenticated, IsClubAdmin]

    def post(self, request, pk):
        club = get_object_or_404(ClubModel, pk=pk)
        socials = [request.data.get('facebook'), request.data.get('instagram'), request.data.get('whatsapp'), request.data.get('website')]
        platforms = ["facebook", "instagram", "whatsapp", "website"]

        for i in range(len(platforms)):
            if socials[i]:
                url = check_valid(socials[i], platforms[i])
                if url:
                    if platform_to_check(platforms[i], club.socials):
                        club.remove_social(platforms[i])
                    club.add_social(platforms[i], url)
                else:
                    return Response({"detail": f"{platforms[i]} link is invalid"}, status=status.HTTP_400_BAD_REQUEST)
            else:
                club.remove_social(platforms[i])

        return Response({"detail": "Social links successfully updated"}, status=status.HTTP_200_OK)


class ClubSocialRetrieveView(generics.RetrieveAPIView):
    queryset = ClubModel.objects.all()
    serializer_class = ClubSocialSerializer
    lookup_field = 'pk'
