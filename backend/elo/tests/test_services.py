import pytest
from elo.services import prob_win, team1Win, scoreDifference, update_elo
from factories import (
    ClubFactory, MemberFactory, GameFactory, GameTypeFactory, EloFactory,
)
from accounts.tests.conftest import UserFactory


class TestProbWin:

    def test_equal_elo_returns_half(self):
        result = prob_win(1000, 1000)
        assert abs(result - 0.5) < 0.001

    def test_higher_elo_favored(self):
        result = prob_win(1200, 1000)
        assert result > 0.5

    def test_lower_elo_disadvantaged(self):
        result = prob_win(800, 1000)
        assert result < 0.5

    def test_probabilities_sum_to_one(self):
        p1 = prob_win(1100, 900)
        p2 = prob_win(900, 1100)
        assert abs(p1 + p2 - 1.0) < 0.001


class TestTeam1Win:

    def test_team1_wins(self):
        gt = type("GT", (), {"name": "badminton_doubles"})()
        assert team1Win("21,15", gt) is True

    def test_team2_wins(self):
        gt = type("GT", (), {"name": "badminton_doubles"})()
        assert team1Win("15,21", gt) is False


class TestScoreDifference:

    def test_positive_difference(self):
        gt = type("GT", (), {"name": "badminton doubles"})()
        assert scoreDifference("21,15", gt) == 6

    def test_reversed_score(self):
        gt = type("GT", (), {"name": "badminton doubles"})()
        assert scoreDifference("15,21", gt) == 6


@pytest.mark.django_db
class TestUpdateElo:

    def test_updates_elo_with_sbmm(self):
        gt = GameTypeFactory(name="badminton_doubles")
        club = ClubFactory()

        members = []
        elos = []
        for _ in range(4):
            u = UserFactory()
            m = MemberFactory(user=u, club=club)
            elo = EloFactory(game_type=gt, elo=1000)
            u.elos.add(elo)
            members.append(m)
            elos.append(elo)

        game = GameFactory(game_type=gt)
        game.team1.add(members[0], members[1])
        game.team2.add(members[2], members[3])

        update_elo("21,15", game, sbmm=True)

        # Winners should have gained elo
        for elo in elos[:2]:
            elo.refresh_from_db()
            assert elo.elo >= 1000
            assert elo.winstreak == 1

        # Losers should have lost elo
        for elo in elos[2:]:
            elo.refresh_from_db()
            assert elo.elo <= 1000
            assert elo.winstreak == 0

    def test_updates_winstreak_without_sbmm(self):
        gt = GameTypeFactory(name="badminton_doubles")
        club = ClubFactory()

        members = []
        elos = []
        for _ in range(4):
            u = UserFactory()
            m = MemberFactory(user=u, club=club)
            elo = EloFactory(game_type=gt, elo=1000)
            u.elos.add(elo)
            members.append(m)
            elos.append(elo)

        game = GameFactory(game_type=gt)
        game.team1.add(members[0], members[1])
        game.team2.add(members[2], members[3])

        update_elo("21,15", game, sbmm=False)

        # Elo should not change without sbmm
        for elo in elos:
            elo.refresh_from_db()
            assert elo.elo == 1000

        # But winstreak should still update
        elos[0].refresh_from_db()
        assert elos[0].winstreak == 1
        elos[2].refresh_from_db()
        assert elos[2].winstreak == 0
