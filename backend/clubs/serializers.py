# Django imports
from django.contrib.auth import get_user_model

# rest_framework imports
from rest_framework import serializers

# local app imports
from .models import ClubModel, MemberRequest, Member, DummyUser, Sport

from .permissions import is_user_admin,  is_user_member

from datetime import timedelta
from events.fetch_events import get_recent_event_date, get_events_this_month

User = get_user_model()

def average_attendance(events):
    """
    Calculates the average attendance for a given set of events.

    Args:
        events: A QuerySet of Event objects.

    Returns:
        The average attendance (float), or 0 if no events are provided or there's no attendance data.
    """
    if not events:
        return 0

    total_attendance = sum(len(event.played_one_match.all()) for event in events)
    return total_attendance / len(events) if events else 0

class ClubSocialSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClubModel
        fields = ['socials']

class SportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sport
        fields = ('name',) 

class ClubSerializer(serializers.ModelSerializer):
    president = serializers.CharField(source='president.username', read_only=True)
    is_club_admin = serializers.SerializerMethodField(read_only=True)
    is_club_president = serializers.SerializerMethodField(read_only=True)
    membership_status = serializers.SerializerMethodField(read_only=True)
    sport_type = SportSerializer(read_only=True)
    is_event_upcoming = serializers.SerializerMethodField(read_only=True)
    logo = serializers.ImageField(use_url=True)
    average_attendance = serializers.SerializerMethodField(read_only=True)
    member_requests = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ClubModel
        fields = fields=('id', 'club_username', 'name', 'sport_type', 'president', 'info', 'date_created', 'logo', 'address', 'coordinates', 'is_club_admin', 'is_club_president', 'membership_status', 'is_active', 'is_event_upcoming', 'logo', 'average_attendance', "member_requests")
    
    def get_is_club_admin(self, obj):
        """Checks if the given user is an admin for the club."""
        user = self.context.get('user') 
        if user:
            return is_user_admin(user, obj)
        return False

    def get_is_club_president(self, obj):
        """Checks if the given user is the president of the club."""
        user = self.context.get('user') 
        if user:
            return obj.president == user
        return False

    def get_membership_status(self, obj):
        """Determines the user's membership status in the club."""
        user = self.context.get('user') 
        if user:
            if  is_user_member(user, obj):
                return 2  # Member
            elif MemberRequest.objects.filter(club=obj, user=user).exists():
                return 1  # Pending Request
            else:
                return 0  # No Application
        else:
            return 0  # No user

    def get_is_event_upcoming(self, obj):
        date = get_recent_event_date(obj)

        if not date:
            return False
        
        # If it doesn't return None then it returns a date
        date_one_day_later = date+timedelta(days=1)
        if date_one_day_later < date.today(): 
            return False
        else:
            return True
        
    def get_average_attendance(self, obj):

        events = get_events_this_month(obj)
        if events:
            return average_attendance(events)
        else:
            return "New!"
        
    def get_member_requests(self, obj):
        if obj:
            count = MemberRequest.objects.filter(club=obj).count()
            return count
        else:
            return 0
        
class MyClubSerializer(serializers.ModelSerializer):

    logo = serializers.ImageField(use_url=True)
    sport_type = SportSerializer(read_only=True)
    
    class Meta:
        model = ClubModel
        fields = ('id', 'name', 'logo', 'sport_type')

class ManyClubSerializer(serializers.ModelSerializer):
    
    sport_type = SportSerializer(read_only=True)
    is_event_upcoming = serializers.SerializerMethodField(read_only=True)
    logo = serializers.ImageField(use_url=True)
    average_attendance = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ClubModel
        fields = fields=('id', 'club_username', 'name', 'sport_type', 'info', 'logo', 'coordinates',  'is_active', 'is_event_upcoming', 'logo', 'average_attendance')


    def get_is_event_upcoming(self, obj):
        date = get_recent_event_date(obj)

        if not date:
            return False
        
        # If it doesn't return None then it returns a date
        date_one_day_later = date+timedelta(days=1)
        if date_one_day_later < date.today(): 
            return False
        else:
            return True
        
    def get_average_attendance(self, obj):

        events = get_events_this_month(obj)
        if events:
            return average_attendance(events)
        else:
            return "New!"

class ClubImageSerializer(serializers.ModelSerializer):
    logo = serializers.ImageField(required=False)
    
    class Meta:
        model = ClubModel
        fields = ['logo'] 

class CreateDummyUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = DummyUser
        fields = ['first_name', 'surname', 'biological_gender']

class MemberRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberRequest
        fields = ('club', )

class MemberRequestDetailSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')

    class Meta:
        model = MemberRequest
        fields = ('id', 'club', 'user', 'username', 'date_requested')

class MemberEventSerializer(serializers.ModelSerializer):
    elo = serializers.SerializerMethodField()
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    surname = serializers.CharField(source='user.surname', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Member
        fields = ['id','first_name', 'surname','username', 'elo']

    def get_elo(self, obj):
        # Get the game_type from the context (passed in from the view)
        game_type = self.context.get('game_type')
         
        if game_type:
            elo_entry = obj.user.elos.filter(game_type=game_type).first()
            return elo_entry.elo if elo_entry else None
        return None 
    
class MemberBasicSerializer(serializers.ModelSerializer):

    first_name = serializers.CharField(source='user.first_name', read_only=True)
    surname = serializers.CharField(source='user.surname', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    is_club_admin = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Member
        fields = ['id', 'first_name', 'surname','username', 'is_club_admin']

    def get_is_club_admin(self, obj):
        """Checks if the given user is an admin for the club."""
        if obj.user:
            return is_user_admin(obj.user, obj.club)
        return False

class MemberAttendanceSerializer(serializers.ModelSerializer):
    attendance_count = serializers.IntegerField(read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.surname', read_only=True)

    class Meta:
        model = Member
        fields = ['first_name', 'last_name', 'attendance_count']

