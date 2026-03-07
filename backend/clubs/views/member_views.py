from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, generics

from events.models import Event
from clubs.models import ClubModel, MemberRequest, Member, DummyUser
from clubs.serializers import (
    MemberRequestSerializer, MemberRequestDetailSerializer,
    MemberEventSerializer, MemberBasicSerializer, CreateDummyUserSerializer,
)
from clubs.permissions import IsClubAdmin, IsClubPresident, is_user_member


class MemberRequestListView(generics.ListAPIView):
    """
    API view to list member requests for a specific club.
    """
    permission_classes = [IsAuthenticated, IsClubAdmin]
    serializer_class = MemberRequestDetailSerializer

    def get_queryset(self):
        club_id = self.kwargs['pk']
        club = get_object_or_404(ClubModel, pk=club_id)
        return MemberRequest.objects.filter(club=club)


class MembersListEventView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsClubAdmin]
    serializer_class = MemberEventSerializer

    def get_queryset(self):
        event_id = self.kwargs['pk1']
        event = get_object_or_404(Event, pk=event_id)
        game_type = event.game_type
        club = event.club

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


class MemberRequestCreateView(generics.CreateAPIView):
    """
    API view for creating a member request.
    """
    permission_classes = [IsAuthenticated]
    queryset = MemberRequest.objects.all()
    serializer_class = MemberRequestSerializer

    def create(self, request, *args, **kwargs):
        club_id = request.data.get('club')
        club = get_object_or_404(ClubModel, pk=club_id)
        user = request.user

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

            memberships = user.memberships.all()
            for membership in memberships:
                if membership.club.id == club.id:
                    membership.is_member = True
                    member_request.delete()
                    club.members.add(membership)
                    return Response(status=status.HTTP_201_CREATED)

            member = Member.objects.create(club=club, user=user)
            club.members.add(member)
            user.memberships.add(member)

            member_request.delete()

            return Response(status=status.HTTP_201_CREATED)
        else:
            return Response(status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, *args, **kwargs):
        member_request_id = self.kwargs.get('pk2')
        member_request = self.get_object(member_request_id)
        member_request.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MemberDeleteView(generics.DestroyAPIView):
    queryset = Member.objects.all()
    permission_classes = [IsAuthenticated, IsClubAdmin]

    def get_object(self):
        club_id = self.kwargs.get('pk')
        member_id = self.kwargs.get('pk2')
        if member_id:
            return get_object_or_404(Member, pk=member_id)
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
            if member.is_admin:
                if member.club.president != request.user:
                    return Response(
                        {"error": "Only the club president can delete an admin."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                member.is_admin = False
            if not member.user.is_active and member.user.username[:10] == "dummyuser_":
                id = int(member.user.username[10:])
                dummymodel = DummyUser.objects.get(pk=id)
                dummymodel.delete()
                member.user.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            member.club.members.remove(member)
            member.is_member = False
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
    serializer_class = None

    def retrieve(self, request, *args, **kwargs):
        member_id = kwargs.get('pk2')
        member = get_object_or_404(Member, pk=member_id)

        if member.is_admin:
            return Response(
                {"error": "This user is already a club admin."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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
