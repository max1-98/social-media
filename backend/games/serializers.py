from rest_framework import serializers
from .models import Game, GameType
from clubs.models import Member

class GameTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameType
        fields = ('name',) 

class SimpleMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username')
    first_name = serializers.CharField(source='user.first_name')
    surname = serializers.CharField(source='user.surname')
    
    class Meta:
        model = Member
        fields = ('id', 'username', 'first_name', 'surname') 

class GameMembersSerializer(serializers.Serializer):
    member_ids = serializers.ListField(child=serializers.IntegerField(), required=True) 

    class Meta:
        model = Game
        fields = ('member_ids',)  # Only the member_ids field is included


#### Potential problems in the get_elo functions
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
        try: 
            
            game_type = GameType.objects.get(name=game_type)
        except:
            return None
            
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

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['team1'] = MemberSerializer(instance.team1.all(), many=True, context={'game_type': instance.game_type.name}).data
        representation['team2'] = MemberSerializer(instance.team2.all(), many=True, context={'game_type': instance.game_type.name}).data
        return representation

class CompleteGameSerializer(serializers.ModelSerializer):
    team1 = MemberSerializer(many=True)
    team2 = MemberSerializer(many=True)

    class Meta:
        model = Game
        fields = ('id', 'team1', 'team2', 'game_type', 'score', 'start_time')