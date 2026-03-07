import pytest
from rest_framework.test import APIClient
from accounts.tests.conftest import UserFactory
from games.tests.conftest import (
    ClubFactory, MemberFactory, EventFactory, GameFactory, GameTypeFactory,
)


@pytest.fixture
def admin_client_with_event(db):
    """Create an admin user with a club and event, returning client + event."""
    user = UserFactory()
    club = ClubFactory(president=user)
    member = MemberFactory(user=user, club=club, is_admin=True)
    club.members.add(member)
    user.memberships.add(member)
    game_type = GameTypeFactory()
    event = EventFactory(club=club, game_type=game_type)
    client = APIClient()
    client.force_authenticate(user=user)
    return client, event


class TestDeleteGameView:
    def test_nonexistent_game_returns_404(self, admin_client_with_event):
        client, event = admin_client_with_event
        response = client.post(
            "/game/delete/",
            {"game_id": 99999, "event_id": event.id},
        )
        assert response.status_code == 404


class TestCompleteGameView:
    def test_missing_fields_returns_400(self, admin_client_with_event):
        client, event = admin_client_with_event
        response = client.post(
            "/game/complete/",
            {"event_id": event.id},
        )
        assert response.status_code == 400

    def test_invalid_score_format_returns_400(self, admin_client_with_event):
        client, event = admin_client_with_event
        game_type = event.game_type
        game = GameFactory(game_type=game_type, event=event)

        # Create members and add to teams
        members = [MemberFactory(user=UserFactory(), club=event.club) for _ in range(4)]
        game.team1.add(members[0], members[1])
        game.team2.add(members[2], members[3])
        event.games.add(game)
        event.in_game_members.add(*members)

        response = client.post(
            "/game/complete/",
            {"game_id": game.id, "event_id": event.id, "score": "not_a_score"},
        )
        assert response.status_code == 400
