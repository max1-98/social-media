from django.db.models import Q
from .models import Event
from clubs.models import Member
from datetime import datetime, date

def get_upcoming_events_for_user(user):
    """
    Fetches upcoming events for a user based on their club memberships.

    Args:
        user: The CustomUser instance.

    Returns:
        A QuerySet of Event objects, ordered by date and start time (most recent first).
    """

    # 1. Fetch clubs the user is a member of
    members = Member.objects.filter(
        user = user
    )

    # 2. Extract clubs from the members
    clubs = [member.club for member in members]
    today = date.today()
    # 3. Fetch upcoming events from those clubs
    upcoming_events = Event.objects.filter(
        club__in=clubs,  # Filter events by clubs the user is a member of
        event_active=False,  # Filter for inactive events
        date__gte=today # Filter for events on or after today's date
    ).order_by('-date', '-start_time')  # Order by date and start time (descending)

    return upcoming_events

def get_active_events_for_user(user):
    """
    Fetches upcoming events for a user based on their club memberships.

    Args:
        user: The CustomUser instance.

    Returns:
        A QuerySet of Event objects, ordered by date and start time (most recent first).
    """

    # 1. Fetch clubs the user is a member of
    members = Member.objects.filter(
        user = user
    )

    # 2. Extract clubs from the members
    clubs = [member.club for member in members]
    today = date.today()
    # 3. Fetch active but no complete games from those clubs
    upcoming_events = Event.objects.filter(
        club__in=clubs,
        event_active=True,
        event_complete=False,
    ).order_by('-date', '-start_time')  # Order by date and start time (descending)

    return upcoming_events