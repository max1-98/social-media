# django imports
from django.shortcuts import get_object_or_404

# rest_framework imports
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, generics



# local apps import
from events.models import Event
from .models import ClubModel, MemberRequest, Member, ClubAdmin, DummyUser
from .serializers import MemberRequestSerializer, MemberRequestDetailSerializer, MemberEventSerializer, MemberAttendanceSerializer
from .serializers import CreateDummyUserSerializer, ClubSerializer, MemberBasicSerializer
from accounts.models import CustomUser
from .permissions import IsClubAdmin, IsClubMember, IsClubPresident

class AllClubView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        clubs = ClubModel.objects.all()
        serializer = ClubSerializer(clubs, many=True)
        return Response(serializer.data)
    
class ClubCreateView(APIView):

    permission_classes = [IsAuthenticated]
    
    def post(self, request):

        club_username = request.data.get('club_username')
        serializer = ClubSerializer(data=request.data)
        if serializer.is_valid():
            if CustomUser.objects.filter(username=club_username).exists() or ClubModel.objects.filter(club_username=club_username).exists():
                return Response({"error": "Club username already exists."}, status=status.HTTP_400_BAD_REQUEST)
            
            club = serializer.save(president=request.user)

            # Create ClubAdmin entry for the current user
            ClubAdmin.objects.create(club=club, admin=request.user) 

            # Create Member entry for the current user
            Member.objects.create(club=club, user=request.user) 
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    
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

class ClubUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated, IsClubAdmin]
    queryset = ClubModel.objects.all()
    serializer_class = ClubSerializer

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
        if Member.objects.filter(club=club, user=user).exists():
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

            # Create the Member instance
            Member.objects.create(club=club, user=user)

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
            if ClubAdmin.objects.filter(club=member.club, admin=member.user).exists():
                # Member is an admin

                # Only allow deletion by the club president
                if member.club.president != request.user:
                    return Response(
                        {"error": "Only the club president can delete an admin."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                
                # Delete the corresponding ClubAdmin if it exists
                ClubAdmin.objects.filter(club=member.club, admin=member.user).delete()
            if not member.user.is_active and member.user.username[:10]=="dummyuser_":
                id = int(member.user.username[10:])
                dummymodel = DummyUser.objects.get(pk=id)
                dummymodel.delete()
                member.user.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            # Delete the member
            member.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        else:
            return Response(status=status.HTTP_404_NOT_FOUND)
        
class MembersListEventView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsClubAdmin]
    serializer_class = MemberEventSerializer

    def get_queryset(self):
        event_id = self.kwargs['pk1']
        event = get_object_or_404(Event, pk=event_id)
        game_type = event.sport
        club = event.club

        # Pass the game_type to the serializer's context
        self.serializer_class.context = {
            'game_type': game_type 
        }

        return Member.objects.filter(club=club)
    
class MembersListView(generics.ListAPIView):

    permission_classes = [IsAuthenticated, IsClubAdmin]
    serializer_class = MemberBasicSerializer

    def get_queryset(self):
        club_id = self.kwargs['pk']
        club = get_object_or_404(ClubModel, pk=club_id)
        return Member.objects.filter(club=club)

class MemberAttendanceListView(generics.CreateAPIView): 
    permission_classes = [IsAuthenticated, IsClubAdmin]
    serializer_class = MemberAttendanceSerializer

    def create(self, request, *args, **kwargs):
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

        # Filter members and order them by surname
        members = Member.objects.filter(pk__in=member_ids).order_by('user__surname') 

        for member in members:
            member.attendance_count = member_attendance[member]
        

        serializer = MemberAttendanceSerializer(members, many=True)
        return Response(serializer.data)

class MyClubsListView(generics.ListAPIView):
    """
    Lists all clubs the current user is a member of.
    """
    serializer_class = ClubSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Get the clubs the user is a member of
        club_ids = Member.objects.filter(user=user).values_list('club_id', flat=True)
        return ClubModel.objects.filter(pk__in=club_ids)

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
    
class MakeMemberAdminView(generics.RetrieveUpdateAPIView):
    """
    View to make a member a club admin.
    """
    permission_classes = [IsAuthenticated, IsClubPresident]
    serializer_class = None  # No serializer needed for this view

    def retrieve(self, request, *args, **kwargs):
        member_id = kwargs.get('pk2')
        member = get_object_or_404(Member, pk=member_id)
        user = member.user
        club = member.club

        # Check if user is already an admin for the club
        if ClubAdmin.objects.filter(club=club, admin=user).exists():
            return Response(
                {"error": "This user is already a club admin."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create the ClubAdmin object if it doesn't exist
        ClubAdmin.objects.create(club=club, admin=user)
        return Response({"message": "User made a club admin successfully."}, status=status.HTTP_201_CREATED)



