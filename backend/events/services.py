from django.shortcuts import get_object_or_404
from django.utils import timezone

from clubs.models import ClubModel, ClubStatus
from events.models import Event
from games.models import GameType
from backend.utils import string_to_date, is_more_than_four_weeks_ago
from events.fetch_events import get_recent_event_date


def create_event(club, game_type_name, event_data):
    """Create an event for a club with the given game type and data.

    Args:
        club: ClubModel instance
        game_type_name: str name of the GameType
        event_data: dict of Event fields (date, start_time, finish_time, etc.)

    Returns:
        Event instance
    """
    game_type = get_object_or_404(GameType, name=game_type_name)
    event = Event.objects.create(club=club, game_type=game_type, **event_data)
    club.events.add(event)
    club.save()
    return event


def auto_manage_events(queryset):
    """Auto-activate, complete, and delete events based on time rules.

    - Activate events whose date+start_time has passed
    - Complete events 2+ days old
    - Delete completed events with no games (and update club active status)
    """
    now = timezone.now()
    today = now.date()

    for event in queryset:
        # Auto-activate past events
        if not event.event_active and event.date < today:
            start_datetime = timezone.datetime.combine(
                today, event.start_time
            ).astimezone()
            if start_datetime < now:
                event.event_active = True
                event.save()

        # Auto-complete expired events (2+ days past)
        if not event.event_complete:
            if event.date + timezone.timedelta(days=2) < today:
                event.event_complete = True
                event.save()

        # Delete empty completed events
        if event.event_complete and event.date + timezone.timedelta(days=2) < today:
            if event.games.count() == 0:
                club = event.club
                date_event = event.date
                event.delete()

                get_recent_event_date(club)
                try:
                    active_model = ClubStatus.objects.get(pk=1)
                except ClubStatus.DoesNotExist:
                    continue

                event_data = active_model.event_dates
                club_id = club.id

                if isinstance(event_data, dict):
                    date_str = event_data.get(str(club_id))
                    date = string_to_date(date_str)

                    if date is None or date <= date_event:
                        most_recent_event = get_recent_event_date(club)

                        if not most_recent_event or is_more_than_four_weeks_ago(most_recent_event):
                            club.is_active = False
                            active_model.event_dates.pop(str(club_id), None)
                            club.save()
                        else:
                            active_model.event_dates[str(club_id)] = str(most_recent_event)

                        active_model.save()
