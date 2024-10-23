# Django imports
from django.contrib.auth import get_user_model

# rest_framework imports
from rest_framework import serializers
from rest_framework.exceptions import APIException

# local app imports
from clubs.models import Member
from .models import Event
from elo.models import Elo
from clubs.serializers import MemberBasicSerializer

class ActivateMemberSerializer(serializers.Serializer):
    event_id = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    member_id = serializers.PrimaryKeyRelatedField(queryset=Member.objects.all())

    def create(self, validated_data):
        event_id = validated_data.get('event_id')
        member_id = validated_data.get('member_id')
        user = member_id.user
        game_type = event_id.sport

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
        event_id.active_members.add(member_id)
        event_id.save()
        return {'message': 'Member activated successfully'}
    
class DeactivateMemberSerializer(serializers.Serializer):
    event_id = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    member_id = serializers.PrimaryKeyRelatedField(queryset=Member.objects.all())

    def create(self, validated_data):
        event_id = validated_data.get('event_id')
        member_id = validated_data.get('member_id')

        # Remove the member from the active_members set
        event_id.active_members.remove(member_id)
        event_id.save()
        return {'message': 'Member deactivated successfully'}
    
class EventDetailSerializer(serializers.ModelSerializer):

    active_members = MemberBasicSerializer(many=True, read_only=True)
    in_game_members = MemberBasicSerializer(many=True, read_only=True)
    
    class Meta:
        model = Event
        fields = ('id', 'sport', 'date', 'start_time', 'finish_time', 'number_of_courts', 'sbmm', 'guests_allowed', 'over_18_under_18_mixed', 'active_members','in_game_members', 'event_active', 'event_complete')
 
class StartEventSerializer(serializers.Serializer):

    event_id = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    

    def create(self, validated_data):
        event_id = validated_data['event_id']

        # Check if the event is already active
        if event_id.event_active:
            raise serializers.ValidationError("Event is already active")

        # Activate the event
        event_id.event_active = True
        event_id.save()

        return {'message': 'Event started successfully'}
    
class CompleteEventSerializer(serializers.Serializer):

    event_id = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all())
    
    def create(self, validated_data):
        event_id = validated_data['event_id']

        # Check if the event is already active
        if event_id.event_complete:
            raise serializers.ValidationError("Event is already active")

        # Activate the event
        event_id.event_complete = True
        event_id.save()

        return {'message': 'Event started successfully'}
    
class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ('id', 'sport', 'date', 'start_time', 'finish_time', 'number_of_courts', 'sbmm', 'guests_allowed', 'over_18_under_18_mixed')
