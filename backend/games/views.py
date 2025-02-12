# Django imports
from django.shortcuts import get_object_or_404
from django.core.cache import cache

# REST imports
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated

# Local imports
from events.models import Event
from .serializers import GameSerializer, CompleteGameSerializer, GameMembersSerializer, SimpleMemberSerializer
from .models import Game, GameType
from accounts.models import CustomUser
from elo.models import Elo
from events.models import Event
from clubs.models import Member
from clubs.permissions import IsClubAdmin, IsClubMember

from .fetch_games import get_user_last_games
from .game_creation import sbmm, mixed_sbmm, social, even_teams


# Elo functions
from elo.elo_functions import update_elo

# Other python libraries
import random

def number_in_team(game_type):

    if game_type.name[-7:] == "singles":
        return 1
    elif game_type.name[-7:] == "doubles":
        return 2

# Currently only handles creating same gender games
# Create seperate Elo styles for men and women?
class SBMMCreateGameView(APIView):
    """
    Create a new game for a given event.
    """
    permission_classes = [IsAuthenticated, IsClubAdmin]
    def post(self, request):

        # Get the events
        event_id = request.data.get('event_id')
        event = get_object_or_404(Event, pk=event_id)

        # Get game type model, the members who are active and team size
        game_type = event.game_type
        active_members = event.active_members.all()
        team_size = number_in_team(game_type)

        # If there are less than 4 people then a game cannot be generated.
        if active_members.count() < 2*team_size:
            return Response(
                            {"error": "Not enough players available for a game"},
                            status=status.HTTP_400_BAD_REQUEST
                            )
        
        # Determine least played members
        least_played_count = min(event.get_player_match_count(member) for member in active_members)
        least_played_members = [member for member in active_members if event.get_player_match_count(member) == least_played_count]

        # Splits up available players in male and female to check if Mixed is possible
        if team_size == 2:
            male_members = active_members.filter(user__biological_gender='male')
            female_members = active_members.filter(user__biological_gender='female')
            mixed_possible = len(male_members)>=2 and len(female_members)>=2 and team_size == 2
        else:
            mixed_possible = False
        
        # Randomly select one from least played members
        player_1 = random.choice(least_played_members)

        # Determine game type
        game_type = event.game_type

        # 0 is same gender, 1 is mixed
        choices = [0,1]
        choice  = random.choice(choices)
        
        # Initialises empty player array
        players = []

        # If mixed is possible and that was the choice of the machine then the following algorithm is run.
        # Otherwise the same gender algorithm is run
        if choice and mixed_possible:
            team1, team2 = mixed_sbmm(player_1, game_type, active_members)
        else:
            team1, team2 = sbmm(player_1, active_members, team_size, game_type)

        # Create Game instance
        game = Game.objects.create(
            event=event,
            game_type=game_type,
        )

        # Add users to the team
        for i in range(len(team1)):
            game.team1.add(team1[i])
            game.team2.add(team2[i])
            event.active_members.remove(team1[i])
            event.active_members.remove(team2[i])
            event.in_game_members.add(team1[i])
            event.in_game_members.add(team2[i])


        event.games.add(game)
        event.save()
        game.save()

        # Serialize the created game
        serializer = GameSerializer(game, context={'game_type': game_type})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
class SocialCreateGameView(APIView):
    """
    Batch create games based on court numbers. 

    ### So if there are 4 courts, the game will schedule (if possible) 4 games.
    ### The batch needs to be done otherwise algorithms can lead to players getting caught in a loop.
    # Should we create the future games too? But how to handle a new player joining?
    

    Process for batch selection:
    Select person who has played the least games. Check their last game (if they haven't played yet then pick 3 randomly)
    Select 3 people not from their last game.

    Then select the next person who has played the least. (Same as above)

    Until there aren't enough for a game. 
    """
    permission_classes = [IsAuthenticated, IsClubAdmin]

    def post(self, request):

        # Grab the event
        event_id = request.data.get('event_id')
        event = get_object_or_404(Event, pk=event_id)

        # Get the game type and active members
        game_type = event.game_type
        active_members = event.active_members.all()

        # Boolean for deciding even teams or not
        et = event.even_teams

        # Gets the team sizes and number of available members
        team_size = number_in_team(game_type)

        # If there aren't enough people to form two teams then send a Bad Request status back
        if active_members.count() < 2*team_size:
            return Response(
                        {"error": "Not enough players available for a game"},
                        status=status.HTTP_400_BAD_REQUEST
                    )


        # Creates a list of players who have played the least number of games. 
        least_played_count = min(event.get_player_match_count(member) for member in active_members)
        least_played_members = [member for member in active_members if event.get_player_match_count(member) == least_played_count]
        
        # Randomly select one from least played members
        player_1 = random.choice(least_played_members)

        # Determine game type
        game_type = event.game_type
        
        potential_players = list(active_members.exclude(pk=player_1.pk))

        team1, team2 = social(player_1, potential_players, event.played_with, team_size, game_type, et)
            
        # Create Game instance
        game = Game.objects.create(
            event=event,
            game_type=game_type,
        )
        # Add users to the team
        for i in range(len(team1)):
            game.team1.add(team1[i])
            game.team2.add(team2[i])
            event.active_members.remove(team1[i])
            event.active_members.remove(team2[i])
            event.in_game_members.add(team1[i])
            event.in_game_members.add(team2[i])


        event.games.add(game)
        event.save()
        game.save()

        # Serialize the created game
        serializer = GameSerializer(game, context={'game_type': game_type})
        return Response(serializer.data, status=status.HTTP_201_CREATED)   

class PegPlayer1View(APIView):
    permission_classes = [IsAuthenticated, IsClubAdmin]

    def post(self, request):

        # Get the events
        event_id = request.data.get('event_id')
        event = get_object_or_404(Event, pk=event_id)

        # Get game type, the members who are active and team size
        game_type = event.game_type
        active_members = event.active_members.all()
        team_size = number_in_team(game_type)

        # If there are less than 4 people then a game cannot be generated.
        if active_members.count() < 2*team_size:
            return Response(
                            {"error": "Not enough players available for a game"},
                            status=status.HTTP_400_BAD_REQUEST
                            )
        
        # Determine least played members
        least_played_count = min(event.get_player_match_count(member) for member in active_members)
        least_played_members = [member for member in active_members if event.get_player_match_count(member) == least_played_count]
        
        # Randomly select one from least played members
        player_1 = random.choice(least_played_members)

        if player_1 is not None:
            serializer = SimpleMemberSerializer(player_1)
            return Response(serializer.data)  # Return the serialized data in a Response
        else:
            return Response({"detail": "No members found for this event."}, status=status.HTTP_404_NOT_FOUND)

"""
Needs to be updated to adapt for different team sizes
"""
class PegCreateGameView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated, IsClubAdmin]
    serializer_class = GameMembersSerializer

    def create(self, request, *args, **kwargs):

        # Get the events
        event_id = request.data.get('event_id')
        event = get_object_or_404(Event, pk=event_id)

        # Get game type
        game_type = event.game_type
        team_size = number_in_team(game_type) # Assumes you have a number_in_team function

        # Serialize the teams selected by the player.
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # Extract team data from the request
            member_ids = serializer.validated_data.get('member_ids', []) 
            
            # Create two teams, splitting the member_ids in half 
            team1_member_ids = member_ids[:team_size]
            team2_member_ids = member_ids[team_size:]

            # Fetch Member objects 
            team1_members = [Member.objects.get(pk=member_id) for member_id in team1_member_ids]
            team2_members = [Member.objects.get(pk=member_id) for member_id in team2_member_ids]

            # Create the Game object
            game = Game.objects.create(
                event=event,
                game_type=game_type,
            )

            # Assign teams to the game 
            game.team1.set(team1_members)
            game.team2.set(team2_members)

            # Save the game
            game.save()

            # Return the serialized game and add the game to the event
            event.games.add(game)
            serializer = GameSerializer(game)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
# This view will delete the Game model. Then reactivate the user's who were in the game.
class DeleteGameView(APIView):
    """
    Delete an existing game, re-activating the players.
    """
    permission_classes = [IsAuthenticated, IsClubAdmin]

    def post(self, request):
        game_id = request.data.get("game_id")
        event_id = request.data.get("event_id")

        if not game_id or not event_id:
            return Response(
                {"error": "Game ID and Event ID are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            game = get_object_or_404(Game, pk=game_id)
            event = get_object_or_404(Event, pk=event_id)

            # Check if the game belongs to the event
            if game not in event.games.all():
                return Response(
                    {"error": "Game does not belong to this event"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get players from the game
            players = list(game.team1.all()) + list(game.team2.all())

            # Re-activate players in the event
            event.active_members.add(*players)
            event.in_game_members.remove(*players)

            # Remove the game from the event's game set
            event.games.remove(game)

            event.save()

            # Delete the game
            game.delete()

            return Response(status=status.HTTP_204_NO_CONTENT)

        except Game.DoesNotExist:
            return Response(
                {"error": "Game not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        except Event.DoesNotExist:
            return Response(
                {"error": "Event not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        except Exception as e:
            return Response(
                {"error": "An error occurred while deleting the game"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
"""
In this view we will process the scores from a game. Mark the game as complete. Add users to completed 1 game field.
Update Elo's using the Elo algorithm (need to implement this in Elo app).  Reactivate all members in the game so they
can be selected for future matches.
"""
class CompleteGameView(APIView):
    """
    Potentially at a later date we will add custom permissions for clubs, so we can make a custom permission for this
    view, ie. the club can allow people in the game to submit a score. Potentially could make it via approval only.
    """
    permission_classes = [IsAuthenticated, IsClubAdmin]

    def post(self, request):


        game_id = request.data.get('game_id')
        event_id = request.data.get('event_id')
        score = request.data.get('score')
        

        if not game_id or not score:
            return Response(
                {"error": "Game ID and score are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            
            event = get_object_or_404(Event, pk=event_id)
            game = get_object_or_404(Game, pk=game_id)

            # Validate score
            team1_score, team2_score = map(int, score.split(","))
            if not (team1_score >= 21 or team2_score >= 21):
                return Response(
                    {"error": "Invalid score. Winning team must have 21 or more points."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Set the game score
            game.score = score
            game.save()

            update_elo(score, game, event.sbmm)
            # Re-add players to active members
            event.active_members.add(*game.all_users.all())
            event.in_game_members.remove(*game.all_users.all())
            # Add members to playedonematch if they haven't been added already
            for player in game.all_users.all():
                if not player in event.played_one_match.all():
                    event.played_one_match.add(player)
            # Update player match counts
            event.update_player_match_counts(game)
            event.update_player_win_counts(game)
            event.update_player_social_counts(game)
            event.save()

            return Response({"message": "Game completed successfully"}, status=status.HTTP_200_OK)

        except (Event.DoesNotExist, Game.DoesNotExist):
            return Response(
                {"error": "Event or game not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        except Exception as e:
            return Response(
                {"error": "An error occurred while completing the game"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

### COME BACK TO THIS VIEW, THE GET_SERIALIZER_CONTEXT FUNCTION SPECIFICALLY
class GameListView(generics.ListAPIView):
    """
    List all Game objects.
    """
    permission_classes = [IsAuthenticated, IsClubMember]
    serializer_class = GameSerializer

    def get_queryset(self):
        event_id = self.kwargs['pk1']
        event = get_object_or_404(Event, pk=event_id)
        return event.games.filter(score__isnull=True)  # Filter games with null score

    def get_serializer_context(self):
        # Retrieve game_type from the event
        game_type = self.get_queryset().first().game_type if self.get_queryset().exists() else None
        context = super().get_serializer_context()
        context.update({'game_type': game_type})
        return context

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        if queryset.exists():
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        else:
            # Return an empty serialized array if the queryset is empty
            serializer = self.get_serializer([], many=True)
            return Response(serializer.data)
       
class EventGamesListView(generics.ListAPIView):
    """
    Displays all of the games from an event.
    """
    serializer_class = CompleteGameSerializer
    permission_classes = [IsAuthenticated, IsClubMember]  # Or any appropriate permissions

    def get_queryset(self):
        event_id = self.kwargs['pk1']  # Get event_id from URL
        event = Event.objects.get(pk=event_id)
        return event.games.filter(score__isnull=False).order_by('-start_time')  # Query complete games

class UserGamesListView(generics.ListAPIView):
    """
    Displays the most recent games from a User.

    Process:
    Find all clubs the user is a part of. 
    (Create an event list view first?)
    Get the games from the last events until the pagination target is reached.
    """
    serializer_class = CompleteGameSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        num_of_games = int(self.request.query_params.get('num_of_games', 10))  # Default to 10
        game_type = self.request.query_params.get('game_type')
        if game_type:
            game_type = GameType.objects.get(name=game_type)
        
        return get_user_last_games(user, game_type=game_type, limit=num_of_games)