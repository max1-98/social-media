from django.db import models
from clubs.models import ClubModel, Member
from games.models import GAME_TYPE_CHOICES, Game
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver
from elo.elo_functions import team1Win

# Create your models here.
MODE_CHOICES = (
    ("sbmm","SBMM"),
    ("social","Social"),
    ("peg_board", "Peg Board"),
)


class Event(models.Model):

    sport = models.CharField(max_length=50, choices=GAME_TYPE_CHOICES)
    games = models.ManyToManyField(Game, blank=True)

    # Key information for members
    date = models.DateField()
    start_time = models.TimeField()
    finish_time = models.TimeField()
    number_of_courts = models.PositiveIntegerField()

    # For permissions and to know who should see the event and be shown the event
    club = models.ForeignKey(ClubModel, on_delete=models.CASCADE)

    # Event game creation configurations

    # Updates people's elo
    sbmm = models.BooleanField(default=True)

    # Which mode and whether to assign even teams (only for social mode)
    mode = models.CharField(max_length=50, choices=MODE_CHOICES, default="SBMM")
    even_teams = models.BooleanField(default=True)

    """
    For displaying event information
    """
    guests_allowed = models.BooleanField(default=False)
    over_18_under_18_mixed = models.CharField(max_length=10, choices=(
        ('over_18', 'Over 18'),
        ('under_18', 'Under 18'),
        ('all ages', 'All ages'),
    ))

    """
    For running the event and fetching statistics once the event is finished.

    Active_members indicates who is available to play. The frontend displays all members, a club admin
    can then come along and activate members. 
    *** In the future request to activate logic may be activated so admins can approve or manually add

    When a game is started the function for deciding teams takes in active_members and whoever has played
    the least number of games (if equal then it picks randomly out of these people).

    Played_one_match is so that admins of the club can easily find out who has attended and played games. 
    To help them run the finances for the club. 
    """
    active_members = models.ManyToManyField(Member, related_name='active_events', blank=True)
    player_match_counts = models.JSONField(default=dict, blank=True)
    in_game_members = models.ManyToManyField(Member, related_name='in_game_members', blank=True)

    played_one_match = models.ManyToManyField(Member, related_name='played_matches', blank=True)

    # JSON field showing how many games each player (using UserID or MemberID?) won
    wins = models.JSONField(default=dict,blank=True)

    # Displays current winstreaks of users (defaulted at 0)
    winstreaks = models.JSONField(default=dict, blank=True)

    # Best winstreak, defaulted to 0, and best_winstreak_user also defaulted to 0
    best_winstreak = models.JSONField(default=dict, blank=True)

    initial_elo = models.JSONField(default=dict, blank=True)
    final_elo = models.JSONField(default=dict, blank=True)

    """
    event_active makes it so that the event has begun. 
    event_complete makes it so that the event has been complete. 
    
    This will hence change the display in the frontend. 
    """
    event_active = models.BooleanField(default=False)
    event_complete = models.BooleanField(default=False)


    def get_player_match_count(self, player):
        return self.player_match_counts.get(str(player.id), 0)
    
    def update_player_match_counts(self, game):
        # Ensure player_match_counts is a dictionary (in case it's empty or not a dictionary)
        if not isinstance(self.player_match_counts, dict):
            self.player_match_counts = {}

        # Iterate through players on the game
        for player in game.all_users.all():
            # Update the player's count in the dictionary
            self.player_match_counts[str(player.id)] = self.player_match_counts.get(str(player.id), 0) + 1
        
        # Save the updated event
        self.save()

    def update_player_win_counts(self, game):
        
        if not isinstance(self.wins,dict):
            self.wins = {}
        
        if not isinstance(self.winstreaks, dict):
            self.winstreaks = {}

        if not isinstance(self.best_winstreak, dict):
            self.best_winstreak = {}

        # If this is true then Team1 won, else Team2 won
        if team1Win(game.score, game.game_type):
            
            # Adds a win and 1 to the winstreak of all people in team1
            for player in game.team1.all():
                self.wins[str(player.id)] = self.wins.get(str(player.id), 0) + 1
                self.winstreaks[str(player.id)] = self.wins.get(str(player.id), 0) + 1

                # If the best winstreak is less than the winstreak of this player then update the best_winstreak to be by this player
                # If the best winstreak is equal to then update the best winstreak to include this player
                if self.best_winstreak:
                    if self.winstreaks[str(player.id)] > max(self.best_winstreak.values()):
                        self.best_winstreak = {}
                        self.best_winstreak[str(player.id)] = self.winstreaks[str(player.id)]
                    elif self.winstreaks[str(player.id)] == max(self.best_winstreak.values()):
                        self.best_winstreak[str(player.id)] = self.winstreaks[str(player.id)]
                else:
                    self.best_winstreak[str(player.id)] = self.winstreaks[str(player.id)]

            # Resets all players in team2's winstreak to 0
            for player in game.team2.all():
                self.winstreaks[str(player.id)] = 0
        else:
            # Mirror for team2 / team1
            for player in game.team2.all():
                self.wins[str(player.id)] = self.wins.get(str(player.id), 0) + 1
                self.winstreaks[str(player.id)] = self.wins.get(str(player.id), 0) + 1

                if self.best_winstreak and self.winstreaks[str(player.id)] > max(self.best_winstreak.values()):
                    self.best_winstreak = {}
                    self.best_winstreak[str(player.id)] = self.winstreaks[str(player.id)]
                elif self.best_winstreak and self.winstreaks[str(player.id)] == max(self.best_winstreak.values()):
                    self.best_winstreak[str(player.id)] = self.winstreaks[str(player.id)]
            
            for player in game.team1.all():
                self.winstreaks[str(player.id)] = 0

        # Save the updates made
        self.save()

    def update_initial_elo(self, player):

        elo_model = player.user.elos.filter(game_type=self.sport).first()

        if not isinstance(self.initial_elo, dict):
            self.initial_elo = {}
        
        self.initial_elo[str(player.id)] = elo_model.elo

        self.save()

    def update_final_elo(self):

        if not isinstance(self.final_elo, dict):
            self.final_elo = {}

        for key in self.initial_elo.keys():
            player = Member.objects.get(id=int(key))
            elo_model = player.user.elos.filter(game_type=self.sport).first()
            self.final_elo[key] = elo_model.elo

        self.save()

