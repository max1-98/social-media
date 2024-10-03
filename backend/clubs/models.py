from django.db import models
from django.utils import timezone
from accounts.models import CustomUser

SPORT_CHOICES = [
    ('badminton', 'Badminton'),
    ('tennis', 'Tennis'),
    ('paddle', 'Paddle'),
]
class ClubModel(models.Model):

    club_username = models.CharField(max_length=150)
    name = models.CharField(max_length=50, unique=True)
    sport = models.CharField(max_length=10, choices=SPORT_CHOICES)
    president = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='club_president')  # ForeignKey to the user model
    info = models.TextField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    signup_link = models.URLField(blank=True, null=True)
    date_created = models.DateTimeField(default=timezone.now)
    logo = models.ImageField(upload_to='club_logos', blank=True, null=True)

    def __str__(self):
        return f"{self.name}"

class ClubAdmin(models.Model):
    club = models.ForeignKey(ClubModel, on_delete=models.CASCADE, related_name='admins') 
    admin = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='clubs_administered')

    class Meta:
        unique_together = ('club', 'admin')

    def __str__(self):
        return f"{self.admin.username} is admin for {self.club.name}"
    
class MemberRequest(models.Model):
    club = models.ForeignKey(ClubModel, on_delete=models.CASCADE)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date_requested = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = (('club', 'user'),)

class Member(models.Model):
    club = models.ForeignKey(ClubModel, on_delete=models.CASCADE)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date_joined = models.DateTimeField(auto_now_add=True)
    #nights_attended = models.ManyToManyField('Event')

"""
class Event(models.Model):
    sport = models.CharField(max_length=10, choices=SPORT_CHOICES)
    games = models.ManyToManyField('Game')
    date = models.DateField()
    start_time = models.TimeField()
    finish_time = models.TimeField()
    number_of_courts = models.PositiveIntegerField()
    club = models.ForeignKey(Club, on_delete=models.CASCADE)
    sbmm = models.BooleanField(default=False)
    guests_allowed = models.BooleanField(default=False)
    over_18_under_18_mixed = models.CharField(max_length=10, choices=(
        ('over_18', 'Over 18'),
        ('under_18', 'Under 18'),
        ('mixed', 'Mixed'),
    ))
    active_members = models.ManyToManyField(Member, related_name='active_events')
    paused_inactive_members = models.ManyToManyField(Member, related_name='paused_inactive_events')
    played_one_match = models.ManyToManyField(Member, related_name='played_matches')

# Game Type Choices
GAME_TYPE_CHOICES = (
    ('badminton_singles', 'Badminton Singles'),
    ('badminton_doubles', 'Badminton Doubles'),
    ('tennis_singles', 'Tennis Singles'),
    ('tennis_doubles', 'Tennis Doubles'),
    ('paddle_singles', 'Paddle Singles'),
    ('paddle_doubles', 'Paddle Doubles'),
)

class Game(models.Model):
    game_type = models.CharField(max_length=20, choices=GAME_TYPE_CHOICES)
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    players = models.ManyToManyField(Member)
    score = models.CharField(max_length=50, blank=True, null=True) # Score can vary
"""