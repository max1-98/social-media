from rest_framework import serializers
from .models import Elo

class EloSerializer(serializers.ModelSerializer):
    winrate = serializers.SerializerMethodField()
    total_games = serializers.SerializerMethodField()

    class Meta:
        model = Elo
        fields = ('game_type', 'elo', 'winstreak', 'last_game', 'best_winstreak', 'winrate', 'total_games')  

    def get_winrate(self, obj):
        if obj.game_loses.count() !=0:
            return int(obj.game_wins.count()/obj.game_loses.count()*100)/100
        else: 
            if obj.game_wins.count() != 0:
                return 0
            
            return 1
        
    def get_total_games(self,obj):
        return obj.game_wins.count()+obj.game_loses.count()