from factory.django import DjangoModelFactory
from factory import SubFactory, LazyAttribute, Sequence
from django.utils import timezone

from accounts.tests.conftest import UserFactory
from clubs.models import ClubModel, Member, MemberRequest, Sport
from games.models import Game, GameType
from events.models import Event
from elo.models import Elo


class SportFactory(DjangoModelFactory):
    class Meta:
        model = Sport

    name = "badminton"


class GameTypeFactory(DjangoModelFactory):
    class Meta:
        model = GameType

    name = "badminton_doubles"
    description = "Doubles badminton"
    sport = SubFactory(SportFactory)


class ClubFactory(DjangoModelFactory):
    class Meta:
        model = ClubModel

    club_username = Sequence(lambda n: f"club_{n}")
    name = Sequence(lambda n: f"Test Club {n}")
    president = SubFactory(UserFactory)


class MemberFactory(DjangoModelFactory):
    class Meta:
        model = Member

    user = SubFactory(UserFactory)
    club = SubFactory(ClubFactory)
    is_admin = False


class MemberRequestFactory(DjangoModelFactory):
    class Meta:
        model = MemberRequest

    user = SubFactory(UserFactory)
    club = SubFactory(ClubFactory)


class EventFactory(DjangoModelFactory):
    class Meta:
        model = Event

    game_type = SubFactory(GameTypeFactory)
    date = LazyAttribute(lambda o: timezone.now().date())
    start_time = LazyAttribute(lambda o: timezone.now().time())
    finish_time = LazyAttribute(lambda o: timezone.now().time())
    number_of_courts = 4
    club = SubFactory(ClubFactory)
    over_18_under_18_mixed = "all ages"


class GameFactory(DjangoModelFactory):
    class Meta:
        model = Game

    game_type = SubFactory(GameTypeFactory)
    event = SubFactory(EventFactory)


class EloFactory(DjangoModelFactory):
    class Meta:
        model = Elo

    game_type = SubFactory(GameTypeFactory)
    elo = 1000
