from django.db import models
from games.models import Game, GameType
from django.utils import timezone

# Create your models here.
class Elo(models.Model):
    """
    This model will be linked to User's by a ManyToMany field. So you can quickly go from User to Elo's, 
    then filter based on game type.
    """
    game_type = models.ForeignKey(GameType, null=True, blank=True, on_delete=models.SET_NULL)
    elo = models.IntegerField(default=1000) # Use FloatField for elo
    last_game = models.DateField(default=timezone.now)
    winstreak = models.IntegerField(default=0) 
    best_winstreak = models.IntegerField(default=0)

    # Many to many field between Game model where the user won/lost
    game_wins = models.ManyToManyField(Game, related_name='wins') # Add related_name
    game_loses = models.ManyToManyField(Game, related_name='loses') # Add related_name