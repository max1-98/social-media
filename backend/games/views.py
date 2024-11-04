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
from .models import Game
from accounts.models import CustomUser
from elo.models import Elo
from events.models import Event
from clubs.models import Member
from clubs.permissions import IsClubAdmin, IsClubMember

from .fetch_games import get_user_last_games


# Elo functions
from elo.elo_functions import update_elo

# Other python libraries
import random

def number_in_team(game_type):

    if game_type[-7:] == "singles":
        return 1
    elif game_type[-7:] == "doubles":
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

        # Get game type, the members who are active and team size
        game_type = event.sport
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

        # Splits up available players in male and female.
        male_members = active_members.filter(user__biological_gender='male')
        female_members = active_members.filter(user__biological_gender='female')
        mixed_possible = len(male_members)>=2 and len(female_members)>=2 and team_size == 2
        
        # Randomly select one from least played members
        player_1 = random.choice(least_played_members)

        # Determine game type
        game_type = event.sport

        # 0 is same gender, 1 is mixed
        choices = [0,1]
        choice  = random.choice(choices)
        
        # Initialises empty player array
        players = []

        # If mixed is possible and that was the choice of the machine then the following algorithm is run.
        # Otherwise the same gender algorithm is run
        if choice and mixed_possible:
            """
            Takes player 1 (the player who has played the least)

            Asserts gender of player 1.

            Finds the closest 2 elo's of members from the same gender as player 1.

            Picks 1 randomly from this set.

            Then picks closest 4 of the opposite gender.

            Picks 2 randomly from this set.

            Then assigns the teams fairly.
            """

            player_1_gender = player_1.user.biological_gender
            player_1_elo = player_1.user.elos.filter(game_type=game_type).values_list('elo', flat=True).first()
            team1 = [player_1]
            potential_players = active_members.filter(user__biological_gender=player_1_gender).exclude(pk=player_1.pk)

            if len(potential_players)<3:
                closest_players = potential_players
            else:
                closest_players = sorted(
                    potential_players,
                    key=lambda player: abs(player.user.elos.filter(game_type=game_type).values_list('elo', flat=True).first() - player_1_elo)
                )[:2]

            team2 = [random.choice(closest_players)]

            opposite_gender = 'female' if player_1_gender == 'male' else 'male'
            potential_players2 = active_members.filter(user__biological_gender=opposite_gender)

            if len(potential_players) < 5:
                closest_players2 = potential_players2
            else:
                closest_players2 = sorted(
                    potential_players2,
                    key=lambda player: abs(player.user.elos.filter(game_type=game_type).values_list('elo', flat=True).first() - player_1_elo)
                )[:4]

            closest_players2 = list(closest_players2)
            player3 = random.choice(closest_players2)
            closest_players2.remove(player3)
            player4 = random.choice(closest_players2)

            team1.append(player3)
            team2.append(player4)

        else:

            """
            Handles same gender match generation

            Asserts gender of player 1. 

            Finds closest 5 of the same gender as player 1. 
            Picks randomly out of this grouping. 

            Chooses smallest difference pairing in average elo out of those 4

            If there are not 5 available then tops this off with members from the opposite gender and repeats the same
            as above.
            """
            # Same gender game
            player_1_gender = player_1.user.biological_gender
            potential_players = active_members.filter(user__biological_gender=player_1_gender).exclude(pk=player_1.pk)  # Exclude player_1
            player_1_elo = player_1.user.elos.filter(game_type=game_type).values_list('elo', flat=True).first()

            if potential_players.count() >= 2*team_size+1:

                # Choose 5 closest players by Elo
                
                closest_players = sorted(
                    potential_players,
                    key=lambda player: abs(player.user.elos.filter(game_type=game_type).values_list('elo', flat=True).first() - player_1_elo)
                )[:2*team_size+1]

                # Chooses randomly from closest_players at the end
            else:

                # Set players to be those closest players. Then fill up with members of the opposite gender.
                closest_players = list(potential_players)

                # Not enough players of the same gender, include opposite gender
                opposite_gender = 'female' if player_1_gender == 'male' else 'male'

                # potential players of the opposite gender
                potential_players_o_g = active_members.filter(user__biological_gender=opposite_gender)
                n = len(closest_players)
                
                # Checks whether there are at least 5-n members of the opposite gender. Then picks the closest from them.
                # Then picks randomly from those random players
                if potential_players_o_g.count() >= 2*team_size+1-n:

                    # Append to closest players instead
                    closest_players1 = sorted(
                        potential_players_o_g,
                        key=lambda player: abs(player.user.elos.filter(game_type=game_type).values_list('elo', flat=True).first() - player_1_elo)
                    )[:(2*team_size+1-n)]

                    for player in closest_players1:
                        closest_players.append(player)

                    # Pick 4-n people randomly from this set

                else:
                    # Pick 4-n people randomly from this set
                    potential_players_o_g  = list(potential_players_o_g)
                    for player in potential_players_o_g:
                        closest_players.append(player)

            i = 0
            
            players = [player_1]
            closest_players = list(closest_players)
            
            
            # Creates set of all players.
            while len(players) < 2*team_size and i < 2*team_size:
                player = random.choice(closest_players)
                players.append(player)
                closest_players.remove(player)
                i += 1

            # Collects all player elo's for this gamemode
            player_elos = []
            for player in players:
                player_elos.append(player.user.elos.filter(game_type=game_type).values_list('elo', flat=True).first())

            elo_differences = []

            """
            Finds equal teams when the team size is 2. Need to improve this for larger team sizes.
            """
            if team_size ==2:
                for i in range(2*team_size-1):
                    for j in range(i+1,2*team_size):
                        # To average we could divide by 2, but this division is redunant as we will find a min later
                        team_1_elo = player_elos[i]+player_elos[j]

                        team_2_elo = 0
                        for k in range(2*team_size):
                            if k != i and k!=j:
                                team_2_elo += player_elos[k]
                        
                        elo_differences.append((abs(team_1_elo-team_2_elo),(i,j)))
            
                smallest_difference, (i, j) = min(elo_differences)
                team1 = [players[i], players[j]]
                team2 = [players[k] for k in range(len(players)) if k != i and k != j]
            else:
                team1 = [players[0]]
                team2 = [players[1]]

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

        # Get the sport type and active members
        game_type = event.sport
        active_members = event.active_members.all()

        # Boolean for deciding even teams or not
        et = event.even_teams

        # Gets the team sizes and number of available members
        team_size = number_in_team(game_type)
        avail_members = active_members.count()

        # If there aren't enough people to form two teams then send a Bad Request status back
        if active_members.count() < 2*team_size:
            return Response(
                        {"error": "Not enough players available for a game"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        while avail_members >= 2*team_size:

            # Creates a list of players who have played the least number of games. 
            least_played_count = min(event.get_player_match_count(member) for member in active_members)
            least_played_members = [member for member in active_members if event.get_player_match_count(member) == least_played_count]
            
            # Randomly select one from least played members
            player_1 = random.choice(least_played_members)

            # Determine game type
            game_type = event.sport

            # Finds the last game and creates a query set of players in the last game
            games = event.games.order_by('-id')
            last_players = []
            for game in games:
                if player_1 in game.all_users.all():

                    # Player is in the game, ie. we have found their last game, keep player_1 in this list
                    last_players = game.all_users
                    break
                
            if last_players:
                """
                If the player has played a game then first find the set of players that they have not played with,
                ie. exclude anyone from the last game.
                """
                potential_players = active_members.exclude(pk__in=[player.pk for player in last_players.all()])

            else:
                """
                Otherwise just take the potential players to be everyone apart from player 1
                """
                potential_players = active_members.exclude(pk=player_1.pk)

            """
            If there are enough players from the set of players not including p1 then pick 2*team_size-1 from here
            Else then pick all from potential players, then fill up with players from the last_players
            """
            potential_players = list(potential_players) 

            if len(potential_players) > 2*team_size-1:

                players = [player_1]
                i = 0
                while i < 2*team_size-1:
                    new_player = random.choice(potential_players)
                    players.append(new_player)
                    potential_players.remove(new_player)
                    i += 1

            else:
                players = potential_players
                players.append(player_1)

                if last_players:
                    last_players = list(last_players.all())
                    last_players.remove(player_1)

                # This won't run if last_players doesn't exist because potential_players will be size 2*team_size
                while len(players) < 2*team_size:
                    new_player = random.choice(last_players)
                    players.append(new_player)
                    last_players.remove(new_player)

            if et:
                player_elos = []
                for player in players:
                    player_elos.append(player.user.elos.filter(game_type=game_type).values_list('elo', flat=True).first())

                elo_differences = []

                """
                Finds equal teams when the team size is 2. Need to improve this for larger team sizes.
                """
                if team_size == 2:
                    for i in range(2*team_size-1):
                        for j in range(i+1,2*team_size):
                            # To average we could divide by 2, but this division is redunant as we will find a min later
                            team_1_elo = player_elos[i]+player_elos[j]
                            team_2_elo = 0
                            for k in range(2*team_size):
                                if k != i and k!=j:
                                    team_2_elo += player_elos[k]
                                
                            elo_differences.append((abs(team_1_elo-team_2_elo),(i,j)))
                    
                    smallest_difference, (i, j) = min(elo_differences)
                    team1 = [players[i], players[j]]
                    team2 = [players[k] for k in range(len(players)) if k != i and k != j]
                else:
                    team1 = [players[0]]
                    team2 = [players[1]]
            else:

                team1 = []
                team2 = []
                print(players)

                while len(team1) < team_size or len(team2) < team_size:
                    player = random.choice(players)
                    team1.append(player)
                    players.remove(player)
                    
                    player = random.choice(players)
                    team2.append(player)
                    players.remove(player)

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
    
        """
        Edit this so it returns a list view
        """
        # Once a game has been made, reduce the avail_member count by the team_size
        avail_members += -2*team_size    

class PegPlayer1View(APIView):
    permission_classes = [IsAuthenticated, IsClubAdmin]

    def post(self, request):

        # Get the events
        event_id = request.data.get('event_id')
        event = get_object_or_404(Event, pk=event_id)

        # Get game type, the members who are active and team size
        game_type = event.sport
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

class PegCreateGameView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated, IsClubAdmin]
    serializer_class = GameMembersSerializer

    def create(self, request, *args, **kwargs):

        # Get the events
        event_id = request.data.get('event_id')
        event = get_object_or_404(Event, pk=event_id)

        # Get game type
        game_type = event.sport
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
        
        return get_user_last_games(user, game_type=game_type, limit=num_of_games)