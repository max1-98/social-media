# Django imports
from django.contrib.auth import get_user_model

# rest_framework imports
from rest_framework import serializers
from rest_framework.exceptions import APIException

# local app imports
from .models import ClubModel, ClubAdmin, MemberRequest, Member, Event



User = get_user_model()

class ActivateMemberSerializer(serializers.Serializer):
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    user = serializers.PrimaryKeyRelatedField(queryset=Member.objects.all())

    def create(self, validated_data):
        event = validated_data.get('event')
        user = validated_data.get('user')

        event.active_members.add(user)
        event.save()
        return {'message': 'Member activated successfully'}
    
class DeactivateMemberSerializer(serializers.Serializer):
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    user = serializers.PrimaryKeyRelatedField(queryset=Member.objects.all())

    def create(self, validated_data):
        event = validated_data.get('event')
        user = validated_data.get('user')

        # Remove the member from the active_members set
        event.active_members.remove(user)
        event.save()
        return {'message': 'Member deactivated successfully'}
    
class ClubAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClubAdmin
        fields = '__all__'

class ClubSerializer(serializers.ModelSerializer):
    president = serializers.CharField(source='president.username', read_only=True)  
    admins = ClubAdminSerializer(many=True, read_only=True)
    is_club_admin = serializers.SerializerMethodField(read_only=True)
    is_club_president = serializers.SerializerMethodField(read_only=True)
    membership_status = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ClubModel
        fields = ('id', 'club_username', 'name', 'sport', 'president', 'info', 'website', 'signup_link', 'date_created', 'logo', 'admins', 'is_club_admin', 'is_club_president', 'membership_status')

    def get_is_club_admin(self, obj):
        """Checks if the given user is an admin for the club."""
        user = self.context.get('user') 
        if user:
            return ClubAdmin.objects.filter(club=obj, admin=user).exists()
        return False

    def get_is_club_president(self, obj):
        """Checks if the given user is the president of the club."""
        user = self.context.get('user') 
        if user:
            return obj.president == user
        return False

    def get_membership_status(self, obj):
        """Determines the user's membership status in the club."""
        user = self.context.get('user') 
        if user:
            if Member.objects.filter(club=obj, user=user).exists():
                return 2  # Member
            elif MemberRequest.objects.filter(club=obj, user=user).exists():
                return 1  # Pending Request
            else:
                return 0  # No Application
        else:
            return 0  # No user

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ('id', 'sport', 'date', 'start_time', 'finish_time', 'number_of_courts', 'sbmm', 'guests_allowed', 'over_18_under_18_mixed')

class MemberRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberRequest
        fields = ('club', )

class MemberRequestDetailSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')

    class Meta:
        model = MemberRequest
        fields = ('id', 'club', 'user', 'username', 'date_requested')

class MemberSerializer(serializers.ModelSerializer):

    username = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    surname = serializers.CharField(source='user.surname', read_only=True)

    class Meta:
        model = Member
        fields = ('id', 'username', 'first_name', 'surname', 'date_joined')  # Include any other fields 

class EventDetailSerializer(serializers.ModelSerializer):

    active_members = MemberSerializer(many=True, read_only=True)
    
    class Meta:
        model = Event
        fields = ('id', 'sport', 'date', 'start_time', 'finish_time', 'number_of_courts', 'sbmm', 'guests_allowed', 'over_18_under_18_mixed', 'active_members', 'event_active', 'event_complete')
 
class StartEventSerializer(serializers.Serializer):

    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    

    def create(self, validated_data):
        event = validated_data['event']

        # Check if the event is already active
        if event.event_active:
            raise serializers.ValidationError("Event is already active")

        # Activate the event
        event.event_active = True
        event.save()

        return {'message': 'Event started successfully'}
    
class CompleteEventSerializer(serializers.Serializer):

    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    
    def create(self, validated_data):
        event = validated_data['event']

        # Check if the event is already active
        if event.event_complete:
            raise serializers.ValidationError("Event is already active")

        # Activate the event
        event.event_complete = True
        event.save()

        return {'message': 'Event started successfully'}