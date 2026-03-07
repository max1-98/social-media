import pytest
from accounts.tests.conftest import UserFactory
from factories import (
    SportFactory, GameTypeFactory, ClubFactory,
    MemberFactory, EventFactory, GameFactory,
)


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
