# Django imports
from django.contrib.auth import get_user_model

# rest_framework imports
from rest_framework import serializers
from rest_framework.exceptions import APIException

# local app imports
from clubs.models import Member
from .models import Event
from elo.models import Elo
from clubs.serializers import MemberSerializer

class ActivateMemberSerializer(serializers.Serializer):
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    user = serializers.PrimaryKeyRelatedField(queryset=Member.objects.all())

    def create(self, validated_data):
        event = validated_data.get('event')
        member = validated_data.get('user')
        user = member.user
        game_type = event.sport

        # Check if user already has Elo for this game type
        elo = user.elos.filter(game_type=game_type)  # Filter the Elo QuerySet
        if elo.exists():
            # Elo exists, no need to create
            elo = elo.first()  # Get the first Elo object
        else:
            # Elo doesn't exist, create it
            elo = Elo.objects.create(game_type=game_type)
            user.elos.add(elo)  # Add to the user's Elo set
            user.save()

        # Activate the member
        event.active_members.add(member)
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
    
class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ('id', 'sport', 'date', 'start_time', 'finish_time', 'number_of_courts', 'sbmm', 'guests_allowed', 'over_18_under_18_mixed')
