import pytest
from factory.django import DjangoModelFactory
from factory import SubFactory, LazyAttribute
from django.utils import timezone

from accounts.tests.conftest import UserFactory
from clubs.models import ClubModel, Member, Sport
from games.models import Game, GameType
from events.models import Event


class SportFactory(DjangoModelFactory):
    class Meta:
        model = Sport

    name = "badminton"


class GameTypeFactory(DjangoModelFactory):
    class Meta:
        model = GameType

    name = "badminton doubles"
    description = "Doubles badminton"
    sport = SubFactory(SportFactory)


class ClubFactory(DjangoModelFactory):
    class Meta:
        model = ClubModel

    club_username = LazyAttribute(lambda o: f"club_{o.president.username}")
    name = "Test Club"
    president = SubFactory(UserFactory)


class MemberFactory(DjangoModelFactory):
    class Meta:
        model = Member

    user = SubFactory(UserFactory)
    club = SubFactory(ClubFactory)
    is_admin = True


class EventFactory(DjangoModelFactory):
    class Meta:
        model = Event

    game_type = SubFactory(GameTypeFactory)
    date = timezone.now().date()
    start_time = timezone.now().time()
    finish_time = timezone.now().time()
    number_of_courts = 4
    club = SubFactory(ClubFactory)


class GameFactory(DjangoModelFactory):
    class Meta:
        model = Game

    game_type = SubFactory(GameTypeFactory)
    event = SubFactory(EventFactory)


@pytest.fixture
def game_type(db):
    return GameTypeFactory()


@pytest.fixture
def club_with_admin(db):
    user = UserFactory()
    club = ClubFactory(president=user)
    member = MemberFactory(user=user, club=club, is_admin=True)
    club.members.add(member)
    return club, user, member


@pytest.fixture
def event_with_game(db, club_with_admin):
    club, user, member = club_with_admin
    game_type = GameTypeFactory()
    event = EventFactory(club=club, game_type=game_type)

    # Create 4 members for two teams
    members = []
    for _ in range(4):
        u = UserFactory()
        m = MemberFactory(user=u, club=club)
        members.append(m)

    game = GameFactory(game_type=game_type, event=event)
    game.team1.add(members[0], members[1])
    game.team2.add(members[2], members[3])
    event.games.add(game)
    event.in_game_members.add(*members)

    return event, game, user, members
