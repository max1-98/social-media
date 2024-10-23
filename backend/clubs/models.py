from django.db import models
from django.utils import timezone
from accounts.models import CustomUser
from django.utils.crypto import get_random_string
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
    bots = models.ManyToManyField(CustomUser, related_name="bots")

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

class DummyUser(models.Model):
    first_name = models.CharField(max_length=255)
    surname = models.CharField(max_length=255)
    biological_gender = models.CharField(max_length=10, choices=[('male', 'Male'), ('female', 'Female')], default='male')
    club = models.ForeignKey(ClubModel, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.first_name} {self.surname}"

    def create_member(self):
        # Create a CustomUser instance with a unique, randomly generated username
        username = self.generate_unique_username()
        email = self.generate_unique_email()
        user = CustomUser.objects.create_user(
            username=username,
            email=email,
            password=self.generate_random_password(),
            first_name=self.first_name,
            surname=self.surname,
            biological_gender = self.biological_gender
        )
        # Set the user's is_active to False to prevent login
        user.is_active = False
        user.save()

        # Create a ClubMember object to link the user to the club
        Member.objects.create(club=self.club, user=user)
        # Add the user to the bots field
        self.club.bots.add(user)

    def generate_unique_username(self):

        return 'dummyuser_' + str(self.pk)

    def generate_unique_email(self):
        return f"{self.first_name.lower()}.{self.surname.lower()}_{self.pk}@{self.club.club_username}.com"

    def generate_random_password(self):
        return get_random_string(length=12)




