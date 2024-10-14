from django.db import models
from django.utils import timezone
from accounts.models import CustomUser
#from games.models import Game

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




