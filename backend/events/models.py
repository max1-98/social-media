from django.db import models
from clubs.models import ClubModel, Member
from games.models import GAME_TYPE_CHOICES, Game

# Create your models here.


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

    # Event configurations
    sbmm = models.BooleanField(default=False)
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

    played_one_match = models.ManyToManyField(Member, related_name='played_matches', blank=True)

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

