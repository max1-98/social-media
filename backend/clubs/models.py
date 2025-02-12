from django.db import models
from django.utils import timezone
from accounts.models import CustomUser
from django.utils.crypto import get_random_string

class ClubModel(models.Model):

    club_username = models.CharField(max_length=12)
    name = models.CharField(max_length=50, unique=True)
    sport_type = models.ForeignKey("clubs.Sport",  null=True, blank=True, on_delete=models.SET_NULL)
    president = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='club_president')  # ForeignKey to the user model
    info = models.TextField(max_length=160, blank=True, null=True)
    date_created = models.DateTimeField(default=timezone.now)
    logo = models.ImageField(upload_to='club_logos', blank=True, null=True)
    bots = models.ManyToManyField(CustomUser, related_name="bots")
    events = models.ManyToManyField('events.Event', related_name="club_events")
    members = models.ManyToManyField('clubs.Member', related_name="members")
    address = models.CharField(max_length=255, blank=True)
    coordinates = models.JSONField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    socials = models.JSONField(default=list, blank=True)


    def add_social(self, platform, url):
        social_data = {"platform": platform, "url": url}
        self.socials.append(social_data)
        self.save()
        
    def remove_social(self,platform):
        self.socials = [social for social in self.socials if social['platform'] != platform]
        self.save()

    def __str__(self):
        return f"{self.name}"
    
class MemberRequest(models.Model):
    club = models.ForeignKey(ClubModel, on_delete=models.CASCADE)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date_requested = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = (('club', 'user'),)

class Member(models.Model):
    club = models.ForeignKey(ClubModel, on_delete=models.CASCADE)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)

    # To remove a member set this to False
    is_member = models.BooleanField(default=True)

    # To make someone an admin set this to True
    is_admin = models.BooleanField(default=False)
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
        
        # Create a ClubMember object to link the user to the club
        member = Member.objects.create(club=self.club, user=user)
        self.club.members.add(member)
        user.memberships.add(member)
        
        # Add the user to the bots field
        self.club.bots.add(user)
        user.save()
        self.club.save()

    def generate_unique_username(self):

        return 'dummyuser_' + str(self.pk)

    def generate_unique_email(self):
        return f"{self.first_name.lower()}.{self.surname.lower()}_{self.pk}@{self.club.club_username}.com"

    def generate_random_password(self):
        return get_random_string(length=12)

class Sport(models.Model):

    name = models.CharField(max_length=50)
    clubs = models.ManyToManyField(ClubModel, related_name="clubs")
    game_types = models.ManyToManyField("games.GameType", related_name="game_types")

class ClubStatus(models.Model):
    name= models.CharField(max_length=20)

    # Stores the date of the event scheduled furthest in the future.
    event_dates = models.JSONField(blank=True, null=True)




