from django.conf import settings
from django.core.management.base import BaseCommand
from games.models import GameType
from clubs.models import Sport
from .sports import SPORTs
from .gametypes import GAMETYPEs


def sport_exists(sport_name):
    return Sport.objects.filter(name=sport_name).exists()

def game_type_exists(game_type_name):
    return GameType.objects.filter(name=game_type_name).exists()

class Command(BaseCommand):

    def handle(self, *args, **options):

        if Sport.objects.count() == 0:
            for sport in SPORTs:
                Sport.objects.create(name=sport['name'])

            for game in GAMETYPEs:
                sport = Sport.objects.get(name=game['sport'])
                game = GameType.objects.create(name=game['name'], description=game['description'], sport=sport, team_size=game['team_size'])
                sport.game_types.add(game)
                sport.save()
            
            print('Sport and GameTypes initialized.')
        else:

            for sport in SPORTs:
                if not sport_exists(sport['name']):
                    Sport.objects.create(name=sport['name'])
            
            for game in GAMETYPEs:

                if not game_type_exists(game['name']):
                    sport = Sport.objects.get(name=game['sport'])
                    game = GameType.objects.create(name=game['name'], description=game['description'], sport=sport, team_size=game['team_size'])
                    sport = game.sport
                    sport.game_types.add(game)
                    sport.save()


            print('GameType and SportTypes fully created.')