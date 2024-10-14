# Django imports
from django.shortcuts import get_object_or_404

# REST imports
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics

# Local imports
from events.models import Event
from .serializers import GameSerializer
from .models import Game
from elo.models import Elo
from events.models import Event
from clubs.models import Member

# Elo functions
from elo.elo_functions import update_elo

# Other python libraries
import random


# Currently only handles creating same gender games
# Create seperate Elo styles for men and women?
class CreateGameView(APIView):

    """
    Create a new game for a given event.
    """

    def post(self, request):
        event_id = request.data.get('event_id')
        event = get_object_or_404(Event, pk=event_id)
        game_type = event.sport
        active_members = event.active_members.all()

        # If there are less than 4 people then a game cannot be generated.
        if active_members.count() < 4:
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
        
        # Randomly select one from least played members
        player_1 = random.choice(least_played_members)

        # Determine game type
        game_type = event.sport
        

        # 0 is same gender, 1 is mixed
        choices = [0,1]
        #choice  = random.choice(choices)
        choice = 1

        # Initialises empty player array
        players = []
        if choice:

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

            if potential_players.count() >= 5:

                # Choose 5 closest players by Elo
                
                closest_players = sorted(
                    potential_players,
                    key=lambda player: abs(player.user.elos.filter(game_type=game_type).values_list('elo', flat=True).first() - player_1_elo)
                )[:5]

                # Chooses randomly from closest_players at the end
            else:

                # Set players to be those closest players. Then fill up with members of the opposite gender.
                players = potential_players

                # Not enough players of the same gender, include opposite gender
                opposite_gender = 'female' if player_1_gender == 'male' else 'male'

                # potential players of the opposite gender
                potential_players_o_g = active_members.filter(user__biological_gender=opposite_gender)
                n = players.count()
                
                # Checks whether there are at least 5-n members of the opposite gender. Then picks the closest from them.
                # Then picks randomly from those random players
                if potential_players_o_g.count() >= 5-n:

                    # Append to closest players instead
                    closest_players = sorted(
                        potential_players_o_g,
                        key=lambda player: abs(player.user.elos.filter(game_type=game_type).values_list('elo', flat=True).first() - player_1_elo)
                    )[:(5-n)]

                    # Pick 4-n people randomly from this set

                else:
                    # Pick 4-n people randomly from this set
                    closest_players = potential_players_o_g
            i = 0
            
            players = list(players)
            closest_players = list(closest_players)

            players.append(player_1)
            
            
            # Creates set of all players.
            while len(players) < 4 and i < 3:
                player = random.choice(closest_players)
                players.append(player)
                closest_players.remove(player)
                i += 1

            # Collects all player elo's for this gamemode
            player_elos = []
            for player in players:
                player_elos.append(player.user.elos.filter(game_type=game_type).values_list('elo', flat=True).first())

            elo_differences = []
            for i in range(3):
                for j in range(i+1,4):
                    # To average we could divide by 2, but this division is redunant as we will find a min later
                    team_1_elo = player_elos[i]+player_elos[j]

                    team_2_elo = 0
                    for k in range(4):
                        if k != i and k!=j:
                            team_2_elo += player_elos[k]
                    
                    elo_differences.append((abs(team_1_elo-team_2_elo),(i,j)))
            
            smallest_difference, (i, j) = min(elo_differences)
            team1 = [players[i], players[j]]
            team2 = [players[k] for k in range(len(players)) if k != i and k != j]
            

        else:
            """
            Handles mixed match generation.

            First checks if there are enough people to fill a mixed game. If not then the above algorithm is used.

            Asserts gender of player 1.

            Determines the percentile that player 1 lies in within their respective gender. 
            Then picks that player. 

            The remaining pairs are chosen as closest to player 1 and player 2 elo-wise within their respective gender.
            """
            # Determine least played members for each gender group
            least_played_male_count = min(
                event.get_player_match_count(member) for member in male_members
            )
            least_played_female_count = min(
                event.get_player_match_count(member) for member in female_members
            )

            least_played_male_members = [
                member
                for member in male_members
                if event.get_player_match_count(member) == least_played_male_count
            ]
            least_played_female_members = [
                member
                for member in female_members
                if event.get_player_match_count(member) == least_played_female_count
            ]


        # Create Game instance
        game = Game.objects.create(
            event=event,
            game_type=game_type,
        )

        # Add users to the team
        game.team1.add(team1[0])
        game.team1.add(team1[1])
        
        game.team2.add(team2[0])
        game.team2.add(team2[1])

        # Remove from active members

        ###!!! There are problems here. When a user joins a game they go back to the list where they 
        ###!!! can be reactivated while in a game. Need to amend the event field to prevent this issue
        event.active_members.remove(team1[0],team1[1],team2[0],team2[1])
        event.games.add(game)
        # Serialize the created game
        serializer = GameSerializer(game, context={'game_type': game_type})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    

# This view will delete the Game model. Then reactivate the user's who were in the game.
class DeleteGameView(APIView):
    """
    Delete an existing game, re-activating the players.
    """

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

            # Remove the game from the event's game set
            event.games.remove(game)

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
        

            # Update Elo
            update_elo(score, game)
            

            # Re-add players to active members
            event.active_members.add(*game.all_users.all())

            # Add members to playedonematch if they haven't been added already
            for player in game.all_users.all():
                if not player in event.played_one_match.all():
                    event.played_one_match.add(player)

            # Update player match counts
            event.update_player_match_counts(game)

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
    serializer_class = GameSerializer

    def get_queryset(self):
        event_id = self.kwargs['pk']
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