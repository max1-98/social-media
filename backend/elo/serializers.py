from rest_framework import serializers
from .models import Elo
from clubs.models import Sport
from games.serializers import GameTypeSerializer


class EloSerializer(serializers.ModelSerializer):
    winrate = serializers.SerializerMethodField()
    total_games = serializers.SerializerMethodField()
    game_type =  serializers.SerializerMethodField()
    style = serializers.SerializerMethodField()
    sport = serializers.SerializerMethodField()
    wins = serializers.SerializerMethodField()

    class Meta:
        model = Elo
        fields = ('game_type', 'elo', 'winstreak', 'last_game', 'best_winstreak', 'winrate', 'total_games', 'sport', 'style', 'wins')  

    def get_wins(self,obj):
        return obj.game_wins.count()
    def get_winrate(self, obj):
        if obj.game_loses.count() !=0:
            return int(obj.game_wins.count()/obj.game_loses.count()*100)/100
        else: 
            if obj.game_wins.count() != 0:
                return 0
            
            return 1
        
    def get_total_games(self,obj):
        return obj.game_wins.count()+obj.game_loses.count()
    
    def get_game_type(self,obj):
        return obj.game_type.name
    
    def get_style(self, obj):
        game_type = obj.game_type.name

        i = 0
        while game_type[i] != " ":
            i += 1
        
        return  game_type[i+1:]
    
    def get_sport(self, obj):
        return obj.game_type.sport.name

