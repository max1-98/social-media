# Django imports
from django.contrib.auth import get_user_model

# rest_framework imports
from rest_framework import serializers
from rest_framework.exceptions import APIException

# local app imports
from clubs.models import Member
from accounts.models import CustomUser
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

        if not event_id.initial_elo.get(str(member_id.id),0):
            event_id.update_initial_elo(member_id)

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
        fields = ('id', 'sport', 'date', 'start_time', 'finish_time', 'number_of_courts', 'sbmm', 'guests_allowed', 'over_18_under_18_mixed', 'active_members','in_game_members', 'event_active', 'event_complete', 'mode', 'even_teams')
 
class EventSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ('sbmm', 'mode', 'even_teams')

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

        # Activate the event
        event_id.event_complete = not event_id.event_complete

        # If the event is complete the update the final elos
        if event_id.event_complete:
            event_id.update_final_elo()

        event_id.save()

        return {'message': 'Event complete status successfully reversed.'}
    
class EventSerializer(serializers.ModelSerializer):

    club_id = serializers.SerializerMethodField()
    club_name = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = ('id', 'sport', 'date', 'start_time', 'finish_time', 'number_of_courts', 'sbmm', 'guests_allowed', 'over_18_under_18_mixed', 'club_id', 'club_name')

    def get_club_id(self, obj):
        """
        Returns the ID of the club associated with the event.
        """
        return obj.club.id 

    def get_club_name(self, obj):
        """
        Returns the ID of the club associated with the event.
        """
        return obj.club.name
    
class EventStatsSerializer(serializers.ModelSerializer):
    best_winstreak_players = serializers.SerializerMethodField()
    highest_win_rate_players = serializers.SerializerMethodField()
    most_wins_players = serializers.SerializerMethodField()
    most_games_played_players = serializers.SerializerMethodField()
    highest_elo_gain_players = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = (
            'best_winstreak_players',
            'highest_win_rate_players',
            'most_wins_players',
            'most_games_played_players',
            'highest_elo_gain_players',
        )

    def get_best_winstreak_players(self, obj):
        """
        Returns a list of players with the best win streak, formatted as a dictionary.
        """
        best_winstreak = obj.best_winstreak
        if not best_winstreak:
            return []
        
        best_winstreak_value = max(best_winstreak.values())
        best_winstreak_players = [
            {
                'name': f"{Member.objects.get(pk=int(player_id)).user.first_name} {Member.objects.get(pk=int(player_id)).user.surname}",
                'best_winstreak': best_winstreak_value,
            }
            for player_id, winstreak in best_winstreak.items()
            if winstreak == best_winstreak_value
        ]
        return best_winstreak_players

    def get_highest_win_rate_players(self, obj):
        """
        Returns a list of players with the highest win rate, formatted as a dictionary.
        """
        wins = obj.wins
        match_counts = obj.player_match_counts
        if not wins or not match_counts:
            return []
        
        highest_win_rate = 0
        highest_win_rate_players = []
        for player_id in wins.keys():
            win_rate = wins.get(player_id, 0) / match_counts.get(player_id, 1)  # Prevent division by 0
            if win_rate > highest_win_rate:
                highest_win_rate = win_rate
                highest_win_rate_players = [
                    {
                        'name': f"{Member.objects.get(pk=int(player_id)).user.first_name} {Member.objects.get(pk=int(player_id)).user.surname}",
                        'win_rate': win_rate,
                    }
                ]
            elif win_rate == highest_win_rate:
                highest_win_rate_players.append(
                    {
                        'name': f"{Member.objects.get(pk=int(player_id)).user.first_name} {Member.objects.get(pk=int(player_id)).user.surname}",
                        'win_rate': win_rate,
                    }
                )
        return highest_win_rate_players

    def get_most_wins_players(self, obj):
        """
        Returns a list of players with the most wins, formatted as a dictionary.
        """
        wins = obj.wins
        if not wins:
            return []
        most_wins = max(wins.values()) if wins else 0
        most_wins_players = [
            {
                'name': f"{Member.objects.get(pk=int(player_id)).user.first_name} {Member.objects.get(pk=int(player_id)).user.surname}",
                'wins': most_wins,
            }
            for player_id, count in wins.items()
            if count == most_wins
        ]
        return most_wins_players

    def get_most_games_played_players(self, obj):
        """
        Returns a list of players who played the most games, formatted as a dictionary.
        """
        match_counts = obj.player_match_counts
        if not match_counts:
            return []
        most_games_played = max(match_counts.values()) if match_counts else 0
        most_games_played_players = [
            {
                'name': f"{Member.objects.get(pk=int(player_id)).user.first_name} {Member.objects.get(pk=int(player_id)).user.surname}",
                'games_played': most_games_played,
            }
            for player_id, count in match_counts.items()
            if count == most_games_played
        ]
        return most_games_played_players
    
    def get_highest_elo_gain_players(self, obj):
        """
        Returns a list of players who gained the most Elo, formatted as a dictionary
        """

        initial_elos = obj.initial_elo
        final_elos = obj.final_elo
        if not initial_elos or not final_elos:
            return []
        
        highest_elo_gain = 0
        highest_elo_gain_players = []
        for player_id in initial_elos.keys():
            elo_gain = final_elos[player_id] - initial_elos[player_id]
            if elo_gain > highest_elo_gain:
                highest_elo_gain = elo_gain
                highest_elo_gain_players = [
                    {
                        'name': f"{Member.objects.get(pk=int(player_id)).user.first_name} {Member.objects.get(pk=int(player_id)).user.surname}",
                        'elo_gain': highest_elo_gain,
                    }
                ]
            elif elo_gain == highest_elo_gain:
                highest_elo_gain_players.append(
                    {
                        'name': f"{Member.objects.get(pk=int(player_id)).user.first_name} {Member.objects.get(pk=int(player_id)).user.surname}",
                        'elo_gain': highest_elo_gain,
                    }
                )
        return highest_elo_gain_players
