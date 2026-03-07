import pytest
from datetime import timedelta
from django.utils import timezone

from events.models import Event
from events.services import create_event, auto_manage_events
from factories import ClubFactory, GameTypeFactory, EventFactory
from accounts.tests.conftest import UserFactory


@pytest.mark.django_db
class TestCreateEvent:

    def test_creates_event_for_club(self):
        club = ClubFactory()
        gt = GameTypeFactory()
        event_data = {
            "date": timezone.now().date(),
            "start_time": timezone.now().time(),
            "finish_time": timezone.now().time(),
            "number_of_courts": 2,
            "over_18_under_18_mixed": "all ages",
        }

        event = create_event(club, gt.name, event_data)

        assert event.club == club
        assert event.game_type == gt
        assert event.number_of_courts == 2
        assert event in club.events.all()


@pytest.mark.django_db
class TestAutoManageEvents:

    def test_activates_past_event(self):
        club = ClubFactory()
        event = EventFactory(
            club=club,
            date=timezone.now().date() - timedelta(days=1),
            start_time=(timezone.now() - timedelta(hours=2)).time(),
            event_active=False,
        )
        club.events.add(event)

        auto_manage_events(club.events.all())

        event.refresh_from_db()
        assert event.event_active is True

    def test_completes_expired_event(self):
        from factories import GameFactory
        club = ClubFactory()
        event = EventFactory(
            club=club,
            date=timezone.now().date() - timedelta(days=3),
            event_active=True,
            event_complete=False,
        )
        # Add a game so the event isn't deleted after completion
        game = GameFactory(game_type=event.game_type, event=event)
        event.games.add(game)
        club.events.add(event)

        auto_manage_events(club.events.all())

        event.refresh_from_db()
        assert event.event_complete is True

    def test_does_not_activate_future_event(self):
        club = ClubFactory()
        event = EventFactory(
            club=club,
            date=timezone.now().date() + timedelta(days=1),
            event_active=False,
        )
        club.events.add(event)

        auto_manage_events(club.events.all())

        event.refresh_from_db()
        assert event.event_active is False

    def test_does_not_complete_recent_event(self):
        club = ClubFactory()
        event = EventFactory(
            club=club,
            date=timezone.now().date(),
            event_complete=False,
        )
        club.events.add(event)

        auto_manage_events(club.events.all())

        event.refresh_from_db()
        assert event.event_complete is False
