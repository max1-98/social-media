from django.db import models
from clubs.models import Member
from django.db.models.signals import m2m_changed
from django.dispatch import receiver
from django.utils import timezone

GAME_TYPE_CHOICES = (
    ('badminton_singles', 'Badminton Singles'),
    ('badminton_doubles', 'Badminton Doubles'),
    ('tennis_singles', 'Tennis Singles'),
    ('tennis_doubles', 'Tennis Doubles'),
    ('paddle_singles', 'Paddle Singles'),
    ('paddle_doubles', 'Paddle Doubles'),
)

# Create your models here.

class Game(models.Model):

    # Games will be ran differently depending on the game type
    game_type = models.CharField(max_length=20, choices=GAME_TYPE_CHOICES)
    start_time = models.DateTimeField(default=timezone.now)
    
    """

    When creating a game, the corresponding club is assigned to the model:
     
    Teams are assigned when the game is created. For now we will only deal with two teams. 

    We create a manytomany field with Member. 
    - This will make it easy to get the corresponding permissions of the user (Game -> Member -> Club -> ClubAdmin)
    - Can find all games from a particular Club (Game -> Member -> Event -> Club)
    - Can find all games from a particular user (Game -> Member -> User)
    - Users must be a Member of the club to participate in a game (For elo-security purposes for both parties)
    - Easy to find what games users have played at a particular club
    """
    team1 = models.ManyToManyField(Member, related_name='team1_games')
    team2 = models.ManyToManyField(Member, related_name='team2_games')

    ### Change this to a JSONField. Make it Elo at the start. So we can track Elo
    all_users = models.ManyToManyField(Member, related_name='all_user_games')

    ### Add a SBMM field, to check in the future whether the game was ranked or not

    """
    Score will be stored as a string and then converted when doing elo-calculations. 
    """
    score = models.CharField(max_length=50, blank=True, null=True) # Score can vary

@receiver(m2m_changed, sender=Game.team1.through)
@receiver(m2m_changed, sender=Game.team2.through)
def update_all_users(sender, instance, action, reverse, **kwargs):
    """
    Updates the `all_users` field of a `Game` instance whenever
    `team1` or `team2` is changed.
    """
    if action == 'post_add' or action == 'post_remove':
        # Get all members from team1 and team2
        all_members = set(instance.team1.all()) | set(instance.team2.all())
        instance.all_users.set(all_members)
        instance.save()

