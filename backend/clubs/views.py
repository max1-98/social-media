# django imports
from django.shortcuts import get_object_or_404

# rest_framework imports
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, generics
from rest_framework.parsers import FormParser, MultiPartParser


# local apps import
from events.models import Event
from .models import ClubModel, MemberRequest, Member, DummyUser
from .serializers import MemberRequestSerializer, MemberRequestDetailSerializer, MemberEventSerializer, MemberAttendanceSerializer
from .serializers import CreateDummyUserSerializer, ClubSerializer, MemberBasicSerializer, SportSerializer, ClubImageSerializer
from .serializers import ManyClubSerializer, MyClubSerializer, ClubSocialSerializer
from accounts.models import CustomUser
from .permissions import IsClubAdmin, IsClubPresident, is_user_member
from backend.settings import GOOGLE_API_KEY
from clubs.models import Sport
from games.models import GameType

# other imports
from urllib.parse import urlparse, urlunparse
import validators
import googlemaps


### Complete this
class CreateSports(APIView):
    def get(self, request):
        new_sport = Sport.objects.create(name="badminton")


def standardize_url(url):
    """Standardizes a URL to the format 'http://www.[url]'."""
    try:
        # Validate the URL first.  This is crucial!
        if not validators.url(url):
            if url[0:3] == "www":
                url = "http://" + url
                return standardize_url(url)
            return None # Or raise an exception, depending on your error handling

        parsed = urlparse(url)

        #Handle URLs without a scheme
        if not parsed.scheme:
            parsed = parsed._replace(scheme="http")

        #Handle URLs with different schemes (e.g., 'https://www.example.com')
        if parsed.scheme != 'http':
            parsed = parsed._replace(scheme="http")

        # Remove any trailing slashes from the netloc
        netloc = parsed.netloc.rstrip("/")
        parsed = parsed._replace(netloc=netloc)

        #Ensure 'www' is present in the netloc
        if not netloc.startswith('www.'):
            if '.' in netloc:  # Only add "www." if there's a dot (.) in the netloc.
                parts = netloc.split('.', 1)
                netloc = f"www.{netloc}"
            else:
                return None # Or raise an exception; this is not a valid domain

        # Reconstruct the standardized URL
        standardized_url = urlunparse(parsed)
        return standardized_url
    except Exception as e:
        print(f"Error standardizing URL '{url}': {e}")
        return None

urls = [
    "www.example.com",
    "https://www.google.com",
    "http://example.com/path",
    "example.com",
    "https://www.example.co.uk/another/path",
    "ftp://ftp.example.com",
    "test",
    "https://subdomain.example.com",
]


"""
Post club creation to-do list for admins
"""
class AddressToLngLatView(APIView):

    permission_classes = [IsAuthenticated, IsClubAdmin]

    def post(self, request):
        gmaps = googlemaps.Client(key=GOOGLE_API_KEY)
        address = request.data.get('address')
        club_id = request.data.get('club_id')

        # Check if the address is provided
        if not address or not club_id:
            return Response({"error": "Address is required"}, status=400)

        try:
            info = gmaps.geocode(address)[0]  # Get geocoding info
            lat_lng = info["geometry"]["location"]
            formatted_address = info["formatted_address"]
            
            club = get_object_or_404(ClubModel, pk=club_id)
            club.coordinates = lat_lng
            club.address = formatted_address
            club.save()

            # Return the lat/lng, address, and formatted address
            return Response({"lat_lng": lat_lng, "address": address, "formatted_address": formatted_address})

        except IndexError:
            return Response({"error": "Invalid address"}, status=400)
        except Exception as e:
            return Response({"error": f"An error occurred: {e}"}, status=500)

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

        # Checks if the club has a sport type, if so removes the club from that sports m2m field
        if club.sport_type:
            sport_old = club.sport_type
            sport_old.clubs.remove(club)

        #Add the sport to the club and vice-versa.
        club.sport_type = sport
        club.save()
        sport.clubs.add(club)
        sport.save()

        return Response({'message': 'Sport added to club successfully.'}, status=status.HTTP_201_CREATED)

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

def check_valid(url, site):
    url = standardize_url(url)

    if site == "website":
        return url
    elif site == "whatsapp":
        # http://chat.whatsapp.com
        if "chat.whatsapp" in url:
            return url

    elif len(url) >= 11+len(site)+4 and url[11:11+len(site)+4] == site+".com": 
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
            # check the social exists
            if socials[i]:
                # check it's a valid link
                url = check_valid(socials[i], platforms[i])
                if url:

                    # check if there is already a social link for that platform
                    if platform_to_check(platforms[i], club.socials):
                        # if so then remove it then add the new link
                        club.remove_social(platforms[i])
                    
                    club.add_social(platforms[i],url)
                else:
                    # Send a 400 Bad Request, platform[i] link is invalid
                    return Response({"detail": f"{platforms[i]} link is invalid"}, status=status.HTTP_400_BAD_REQUEST)
            else:
                # No link being provided means the user wanted to remove that link
                club.remove_social(platforms[i])
        
        return Response({"detail": "Social links successfully updated"}, status=status.HTTP_200_OK)
       
class ClubSocialRetrieveView(generics.RetrieveAPIView):
    queryset = ClubModel.objects.all()
    serializer_class = ClubSocialSerializer
    lookup_field = 'pk'
"""
Club info views 
"""
class AllClubView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None, *args, **kwargs):
        southwest_lat = request.GET.get('southwest_lat')
        southwest_lng = request.GET.get('southwest_lng')
        northeast_lat = request.GET.get('northeast_lat')
        northeast_lng = request.GET.get('northeast_lng')
        
        sport_name = kwargs.get('sport')  # Get the sport from URL parameters

        if sport_name:
            try:
                sport_model = Sport.objects.get(name=sport_name)
                clubs = ClubModel.objects.filter(sport_type=sport_model) #Filter by sport_type
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
            serializer = ClubSerializer(club, context={'user': user})  # Pass the user to the serializer
            return Response(serializer.data)
        else:
            return Response(status=status.HTTP_401_UNAUTHORIZED) 

    def delete(self, request, pk):
        club = self.get_object(pk)
        club.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class MemberRequestListView(generics.ListAPIView):
    """
    API view to list member requests for a specific club.
    """
    permission_classes = [IsAuthenticated, IsClubAdmin]
    serializer_class = MemberRequestDetailSerializer

    def get_queryset(self):
        club_id = self.kwargs['pk']  # Get the club ID from the URL
        club = get_object_or_404(ClubModel, pk=club_id)  # Get the club or raise 404 if not found
        return MemberRequest.objects.filter(club=club)  # Filter requests for the specified club

class MembersListEventView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsClubAdmin]
    serializer_class = MemberEventSerializer

    def get_queryset(self):
        event_id = self.kwargs['pk1']
        event = get_object_or_404(Event, pk=event_id)
        game_type = event.game_type
        club = event.club

        # Pass the game_type to the serializer's context
        self.serializer_class.context = {
            'game_type': game_type 
        }
        
        return club.members.all()
    
class MembersListView(generics.ListAPIView):

    permission_classes = [IsAuthenticated, IsClubAdmin]
    serializer_class = MemberBasicSerializer

    def get_queryset(self):
        club_id = self.kwargs['pk']
        club = get_object_or_404(ClubModel, pk=club_id)
        return club.members.all()

class MemberAttendanceListView(APIView): 
    permission_classes = [IsAuthenticated, IsClubAdmin]
    serializer_class = MemberAttendanceSerializer

    def post(self, request, *args, **kwargs):
        start_date = request.data.get('start_date')
        finish_date = request.data.get('finish_date')
        club_id = request.data.get('club_id')

        # Ensure all required parameters are provided
        if not all([start_date, finish_date, club_id]):
            return Response({'error': 'Missing required parameters'}, status=400)  # Return an error if missing

        # Get relevant events
        events = Event.objects.filter(
            date__range=[start_date, finish_date],
            club_id=club_id  # Assuming you have a club_id field in Event model
        )

        # Calculate attendance for each member
        member_attendance = {}
        for event in events:
            for member in event.played_one_match.all():
                if member not in member_attendance:
                    member_attendance[member] = 0
                member_attendance[member] += 1

        member_ids = [member.id for member in member_attendance.keys()]

        # Filter members and order them by surname, can this be done using a get?
        members = Member.objects.filter(pk__in=member_ids).order_by('user__surname') 

        for member in members:
            member.attendance_count = member_attendance[member]
        

        serializer = MemberAttendanceSerializer(members, many=True)
        return Response(serializer.data)

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
    
"""
Club creation / deletion / management 
"""
class ClubCreateView(APIView):

    permission_classes = [IsAuthenticated]
    
    def post(self, request):

        club_username = request.data.get('club_username')
        club_name = request.data.get('name')
        club_description = request.data.get('info')

        if not club_username:
            return Response({"error": "Please provide a club username."}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(club_username)>12:
            return Response({"error": "Username must be less than 12 characters."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not club_name:
            return Response({"error": "Please provide a club name."}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(club_name)>50:
            return Response({"error": "Club name must be less than 50 characters."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not club_description:
            return Response({"error": "Please provide a club description."}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(club_description)>160:
            return Response({"error": "Club description must be less than 160 characters."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if Club or CustomUser with the username=club_username exists
        if CustomUser.objects.filter(username=club_username).exists() or ClubModel.objects.filter(club_username=club_username).exists():
            return Response({"error": "Club username already exists."}, status=status.HTTP_400_BAD_REQUEST)
        
        if request.user:
            club = ClubModel(
                club_username=club_username,
                name=club_name,
                president=request.user,
                info=club_description,
            )
        club.save()

        # Create Member entry for the current user
        member = Member.objects.create(club=club, user=request.user) 
        member.is_admin = True
        member.save()
        request.user.memberships.add(member)
        club.members.add(member)
        serializer = ClubSerializer(club)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class ClubUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated, IsClubAdmin]
    queryset = ClubModel.objects.all()
    serializer_class = ClubSerializer
    
class MemberRequestCreateView(generics.CreateAPIView):
    """
    API view for creating a member request.
    """
    permission_classes = [IsAuthenticated]  # Only authenticated users can create requests
    queryset = MemberRequest.objects.all()
    serializer_class = MemberRequestSerializer

    def create(self, request, *args, **kwargs):
        club_id = request.data.get('club')
        club = get_object_or_404(ClubModel, pk=club_id)
        user = request.user

        # Check if a Member object already exists for this club and user
        
        if is_user_member(user, club):
            return Response({'error': 'You are already a member of this club.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class MemberRequestDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        club = request.data.get('club')
        user = request.user

        if not club or not user:
            return Response({'error': 'Missing club or user data'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            member_request = MemberRequest.objects.get(club_id=club, user=user)
            member_request.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except MemberRequest.DoesNotExist:
            return Response({'error': 'Member request not found'}, status=status.HTTP_404_NOT_FOUND)

class MemberAcceptView(APIView):

    permission_classes = [IsAuthenticated, IsClubAdmin]

    def get_object(self, pk):
        try:
            return MemberRequest.objects.get(pk=pk)
        except MemberRequest.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    def get(self, request, *args, **kwargs):
        member_request_id = self.kwargs.get('pk2')
        member_request = self.get_object(member_request_id)

        if member_request:
            club = member_request.club
            user = member_request.user

            # Check if the user has a member instance already (ie. is a past member), if so
            # just change the member model: member.is_member=True
            memberships = user.memberships.all()
            for membership in memberships:
                if membership.club.id == club.id:
                    membership.is_member=True
                    member_request.delete()
                    club.members.add(membership)
                    return Response(status=status.HTTP_201_CREATED)
            
            member = Member.objects.create(club=club, user=user)
            club.members.add(member)
            user.memberships.add(member)

            # Delete the MemberRequest
            member_request.delete()

            return Response(status=status.HTTP_201_CREATED)  # Return success status
        else:
            return Response(status=status.HTTP_404_NOT_FOUND)  # Handle cases where member_request is 
        
    def delete(self, request, *args, **kwargs):
        member_request_id = self.kwargs.get('pk2')
        member_request = self.get_object(member_request_id)
        member_request.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

### Edit this to change how dummy users are deleted
class MemberDeleteView(generics.DestroyAPIView):
    queryset = Member.objects.all()
    permission_classes = [IsAuthenticated, IsClubAdmin]

    def get_object(self):
        """
        Override to allow deletion by either club admin or the request creator.
        """
        # Get club ID/ member ID from URL parameter
        club_id = self.kwargs.get('pk')
        member_id = self.kwargs.get('pk2')
        if member_id:
            return get_object_or_404(Member, pk = member_id)
        elif club_id:
            club = get_object_or_404(ClubModel, pk=club_id)
            return get_object_or_404(Member, club=club, user=self.request.user) 
        else:
            return Response({"error": "No club id or member id provided"}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        member = self.get_object()

        if member.club.president == member.user:
            return Response(
                {"error": "A president cannot be revoked of their membership."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if member:
            # Check if the Member is an admin
            if member.is_admin:
                # Member is an admin

                # Only allow deletion by the club president
                if member.club.president != request.user:
                    return Response(
                        {"error": "Only the club president can delete an admin."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                
                # Delete the corresponding ClubAdmin if it exists
                member.is_admin = False
            if not member.user.is_active and member.user.username[:10]=="dummyuser_":
                id = int(member.user.username[10:])
                dummymodel = DummyUser.objects.get(pk=id)
                dummymodel.delete()
                member.user.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            # Delete the member
            member.club.members.remove(member)
            member.is_member=False
            member.save()
            return Response(status=status.HTTP_204_NO_CONTENT)
        else:
            return Response(status=status.HTTP_404_NOT_FOUND)

class CreateDummyUserView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated, IsClubAdmin]
    serializer_class = CreateDummyUserSerializer

    def create(self, request, *args, **kwargs):
        club = get_object_or_404(ClubModel, pk=kwargs.get('pk'))
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        dummy_user = serializer.save(club=club)
        dummy_user.create_member()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
class AdminUpdateView(generics.RetrieveUpdateDestroyAPIView):
    """
    View to make/remove a member as club admin.
    """
    permission_classes = [IsAuthenticated, IsClubPresident]
    serializer_class = None  # No serializer needed for this view

    def retrieve(self, request, *args, **kwargs):
        member_id = kwargs.get('pk2')
        member = get_object_or_404(Member, pk=member_id)

        # Check if user is already an admin for the club
        if member.is_admin:
            return Response(
                {"error": "This user is already a club admin."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create the ClubAdmin object if it doesn't exist
        member.is_admin = True
        member.save()
        return Response({"message": "User made a club admin successfully."}, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        """
        Removes a member as a club admin.
        """
        member_id = kwargs.get('pk2')
        member = get_object_or_404(Member, pk=member_id)
        
        if member.is_admin:
            member.is_admin = False
            member.save()
            return Response({"message": "User removed as club admin successfully."}, status=status.HTTP_204_NO_CONTENT)
        else:
            return Response(
                {"error": "This user is not a club admin."},
                status=status.HTTP_400_BAD_REQUEST,
            )

