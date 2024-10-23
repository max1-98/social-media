# Django imports
from django.contrib.auth import get_user_model

# rest_framework imports
from rest_framework import serializers

# local app imports
from .models import ClubModel, ClubAdmin, MemberRequest, Member, DummyUser

User = get_user_model()
    
class ClubAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClubAdmin
        fields = '__all__'

class ClubSerializer(serializers.ModelSerializer):
    president = serializers.CharField(source='president.username', read_only=True)  
    admins = ClubAdminSerializer(many=True, read_only=True)
    is_club_admin = serializers.SerializerMethodField(read_only=True)
    is_club_president = serializers.SerializerMethodField(read_only=True)
    membership_status = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ClubModel
        fields = ('id', 'club_username', 'name', 'sport', 'president', 'info', 'website', 'signup_link', 'date_created', 'logo', 'admins', 'is_club_admin', 'is_club_president', 'membership_status')

    def get_is_club_admin(self, obj):
        """Checks if the given user is an admin for the club."""
        user = self.context.get('user') 
        if user:
            return ClubAdmin.objects.filter(club=obj, admin=user).exists()
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
            if Member.objects.filter(club=obj, user=user).exists():
                return 2  # Member
            elif MemberRequest.objects.filter(club=obj, user=user).exists():
                return 1  # Pending Request
            else:
                return 0  # No Application
        else:
            return 0  # No user

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
            return ClubAdmin.objects.filter(club=obj.club, admin=obj.user).exists()
        return False

class MemberAttendanceSerializer(serializers.ModelSerializer):
    attendance_count = serializers.IntegerField(read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.surname', read_only=True)

    class Meta:
        model = Member
        fields = ['first_name', 'last_name', 'attendance_count']

