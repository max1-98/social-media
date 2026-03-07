import pytest

from games.services import create_game_for_event, complete_game, delete_game
from games.models import Game
from factories import (
    ClubFactory, MemberFactory, EventFactory, GameFactory,
    GameTypeFactory, EloFactory,
)
from accounts.tests.conftest import UserFactory


@pytest.mark.django_db
class TestCreateGameForEvent:

    def test_creates_game_and_moves_members(self):
        club = ClubFactory()
        gt = GameTypeFactory(name="badminton_doubles")
        event = EventFactory(club=club, game_type=gt)

        members = []
        for _ in range(4):
            u = UserFactory()
            m = MemberFactory(user=u, club=club)
            event.active_members.add(m)
            members.append(m)

        team1 = members[:2]
        team2 = members[2:]

        game = create_game_for_event(event, team1, team2)

        assert game.game_type == gt
        assert set(game.team1.all()) == set(team1)
        assert set(game.team2.all()) == set(team2)
        assert game in event.games.all()

        # Members moved from active to in-game
        for m in members:
            assert m not in event.active_members.all()
            assert m in event.in_game_members.all()


@pytest.mark.django_db
class TestCompleteGame:

    def _setup_game(self):
        club = ClubFactory()
        gt = GameTypeFactory(name="badminton_doubles")
        event = EventFactory(club=club, game_type=gt, sbmm=False)

        members = []
        for _ in range(4):
            u = UserFactory()
            m = MemberFactory(user=u, club=club)
            # Create Elo record so update_elo doesn't fail
            elo = EloFactory(game_type=gt, elo=1000)
            u.elos.add(elo)
            members.append(m)

        game = GameFactory(game_type=gt, event=event)
        game.team1.add(members[0], members[1])
        game.team2.add(members[2], members[3])
        event.games.add(game)
        event.in_game_members.add(*members)

        return event, game, members

    def test_completes_game_with_valid_score(self):
        event, game, members = self._setup_game()

        complete_game(game, event, "21,15")

        game.refresh_from_db()
        assert game.score == "21,15"

        # Members reactivated
        for m in members:
            assert m in event.active_members.all()
            assert m not in event.in_game_members.all()
            assert m in event.played_one_match.all()

    def test_raises_on_invalid_score_format(self):
        event, game, _ = self._setup_game()

        with pytest.raises(ValueError, match="Invalid score format"):
            complete_game(game, event, "abc")

    def test_raises_on_low_score(self):
        event, game, _ = self._setup_game()

        with pytest.raises(ValueError, match="21 or more"):
            complete_game(game, event, "15,10")


@pytest.mark.django_db
class TestDeleteGame:

    def test_deletes_game_and_reactivates_players(self):
        club = ClubFactory()
        gt = GameTypeFactory(name="badminton_doubles")
        event = EventFactory(club=club, game_type=gt)

        members = []
        for _ in range(4):
            u = UserFactory()
            m = MemberFactory(user=u, club=club)
            members.append(m)

        game = GameFactory(game_type=gt, event=event)
        game.team1.add(members[0], members[1])
        game.team2.add(members[2], members[3])
        event.games.add(game)
        event.in_game_members.add(*members)

        game_id = game.id
        delete_game(game, event)

        assert not Game.objects.filter(pk=game_id).exists()
        for m in members:
            assert m in event.active_members.all()
            assert m not in event.in_game_members.all()

    def test_raises_on_wrong_event(self):
        event1 = EventFactory()
        event2 = EventFactory()
        game = GameFactory(event=event1)
        event1.games.add(game)

        with pytest.raises(ValueError, match="does not belong"):
            delete_game(game, event2)
