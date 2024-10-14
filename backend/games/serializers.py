from rest_framework import serializers
from .models import Game
from clubs.models import Member

class MemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')
    first_name = serializers.CharField(source='user.first_name')
    surname = serializers.CharField(source='user.surname')
    elo = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = ('id', 'username', 'first_name', 'surname', 'elo') 

    def get_elo(self, obj):
        # Retrieve elo for a member and a specific game_type
        # Assuming 'game_type' is available in the context 
        game_type = self.context.get('game_type') 
        if game_type:
            elo = obj.user.elos.filter(game_type=game_type).values_list('elo', flat=True).first()
            return elo
        return None

class GameSerializer(serializers.ModelSerializer):
    team1 = MemberSerializer(many=True, read_only=True)
    team2 = MemberSerializer(many=True, read_only=True)

    class Meta:
        model = Game
        fields = ('id','team1','team2')