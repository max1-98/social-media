from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ClubModel, ClubAdmin

User = get_user_model()


class ClubAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClubAdmin
        fields = '__all__'

class ClubSerializer(serializers.ModelSerializer):
    president = serializers.PrimaryKeyRelatedField(read_only=True)
    admins = ClubAdminSerializer(many=True, read_only=True)
    #is_club_admin = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ClubModel
        fields = ('id', 'club_username', 'name', 'sport', 'president', 'info', 'website', 'signup_link', 'date_created', 'logo', 'admins',) #'is_club_admin') 

    def get_is_club_admin(self, obj):
        return obj.admins.filter(admin=self.context['request'].user).exists()
    
