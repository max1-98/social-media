
from django.db.models import Max
from datetime import datetime, timedelta

def get_events_for_user(user):
    """
    Fetches upcoming events for a user based on their club memberships.

    Args:
        user: The CustomUser instance.

    Returns:
        A QuerySet of Event objects, ordered by date and start time (most recent first).
    """

    # 1. Fetch club memberships the user is a member of
    memberships = user.memberships.all()

    # 2. Fetch events from those clubs
    events = []
    for membership in memberships:
        events.extend(membership.club.events.all())

    # 3. Sort events
    events.sort(key=lambda event: (event.date, event.start_time), reverse=True)

    return events

def get_upcoming_events_for_user(user):
    """
    Fetches upcoming events for a user based on their club memberships.

    Args:
        user: The CustomUser instance.

    Returns:
        A QuerySet of Event objects, ordered by date and start time (most recent first).
    """

    # 1. Fetch club memberships the user is a member of
    memberships = user.memberships.all()

    # 2. Fetch events from those clubs
    events = []
    for membership in memberships:
        events.extend(membership.club.events.all())

    # 3. Upcoming events
    upcoming_events = [event for event in events if not event.is_active]

    # 4. Sort events
    upcoming_events.sort(key=lambda event: (event.date, event.start_time), reverse=True)

    return upcoming_events

def get_active_events_for_user(user):

    """
    Fetches active events for a user based on their club memberships.

    Args:
        user: The CustomUser instance.

    Returns:
        A QuerySet of Event objects, ordered by date and start time (most recent first).
    """

    # 1. Fetch club memberships the user is a member of
    memberships = user.memberships.all()

    # 2. Fetch events from those clubs
    events = []
    for membership in memberships:
        events.extend(membership.club.events.all())

    # 3. Active events
    active_events = [event for event in events if event.is_active and not event.is_complete]

    # 4. Sort events
    active_events.sort(key=lambda event: (event.date, event.start_time), reverse=True)

    return active_events

def get_complete_events_for_user(user):

    """
    Fetches complete events for a user based on their club memberships.

    Args:
        user: The CustomUser instance.

    Returns:
        A QuerySet of Event objects, ordered by date and start time (most recent first).
    """

    # 1. Fetch club memberships the user is a member of
    memberships = user.memberships.all()

    # 2. Fetch events from those clubs
    events = []
    for membership in memberships:
        events.extend(membership.club.events.all())

    # 3. complete events
    complete_events = [event for event in events if event.is_complete]

    # 4. Sort events
    complete_events.sort(key=lambda event: (event.date, event.start_time), reverse=True)

    return complete_events

def get_recent_event_date(club):
    """
    This function finds the most recent event for a club (this may be long in the future)
    """
    try:
        latest_date = club.events.aggregate(Max('date'))['date__max'] #Use aggregate to only fetch maximum date
        return latest_date
    except TypeError: # Handle the case where there are no events
        return None

def get_events_this_month(club):
    """
    Retrieves completed events from a club within the last 28 days.

    Args:
        club: An object representing a club with an events attribute (likely a Django model).

    Returns:
        A QuerySet of events that meet the criteria.  Returns an empty QuerySet if no events match.
    """
    today = datetime.today()
    four_weeks_ago = today - timedelta(days=28)

    events = club.events.filter(event_complete=True, date__gte=four_weeks_ago)
    return events