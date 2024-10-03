# django imports
from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404

# rest_framework imports
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status,  permissions, generics
from rest_framework.exceptions import PermissionDenied, AuthenticationFailed
from rest_framework.settings import api_settings


# local apps import
from .models import ClubModel, MemberRequest, Member, ClubAdmin
from .serializers import ClubSerializer, MemberRequestSerializer, MemberRequestDetailSerializer, MemberSerializer
from accounts.models import CustomUser
from .permissions import IsClubAccessible

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
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class AllClubView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        clubs = ClubModel.objects.all()
        serializer = ClubSerializer(clubs, many=True)
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

class ClubUpdateView(generics.UpdateAPIView):
    queryset = ClubModel.objects.all()
    serializer_class = ClubSerializer

class MemberRequestListView(generics.ListAPIView):
    """
    API view to list member requests for a specific club.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = MemberRequestDetailSerializer

    def get_queryset(self):
        club_id = self.kwargs['pk']  # Get the club ID from the URL
        club = get_object_or_404(ClubModel, pk=club_id)  # Get the club or raise 404 if not found
        return MemberRequest.objects.filter(club=club)  # Filter requests for the specified club
    
class MemberRequestView(generics.CreateAPIView):
    """
    API view for creating a member request.
    """
    #permission_classes = [permissions.IsAuthenticated]  # Only authenticated users can create requests
    #authentication_classes = (TokenAuthentication,)
    queryset = MemberRequest.objects.all()
    serializer_class = MemberRequestSerializer

    def perform_create(self, serializer):
        """
        Override to set the user field automatically.
        """
        serializer.save(user=self.request.user)  # Set the user to the current logged-in user

class MemberAcceptView(APIView):

    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return MemberRequest.objects.get(pk=pk)
        except MemberRequest.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

    def get(self, request, pk):

        member_request = self.get_object(pk)

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
        
    def delete(self, request, pk):
        member_request = self.get_object(pk)
        member_request.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class MemberDeleteView(generics.DestroyAPIView):
    queryset = Member.objects.all()
    permission_classes = [IsAuthenticated]

    def destroy(self, request, pk=None):  
        member = self.get_object() 
        if member:
            member.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        else:
            return Response(status=status.HTTP_404_NOT_FOUND)

class MembersView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MemberSerializer
    def get_queryset(self):
        club_id = self.kwargs['pk']
        club = get_object_or_404(ClubModel, pk=club_id)
        return Member.objects.filter(club=club)
    

    