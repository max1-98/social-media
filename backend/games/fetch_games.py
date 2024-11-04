from django.db.models import Q
from events.models import Event

def get_user_last_games(user, game_type=None, limit=10):
    """
    Finds the user's last games, considering events, with optional game type filtering and limit.

    Args:
        user: The CustomUser instance.
        game_type: Optional. Filter games by a specific game type.
        limit: Optional. The maximum number of games to return. Default is 10.

    Returns:
        A QuerySet of Game objects, ordered by game start time (most recent first).
    """
    # Get all events the user has participated in
    events = Event.objects.filter(
        Q(played_one_match__user=user)
    ).distinct()

    # Order events by date (most recent first)
    events = events.order_by('-date', '-start_time')

    # Create a list to store the games
    games = []

    for event in events:
        # Get games for the current event
        event_games = event.games.filter(score__isnull=False).order_by('-start_time')
        if game_type:
            event_games = event_games.filter(game_type=game_type)

        # Add the event's games to the list, up to the limit
        for game in event_games:
            if len(games) < limit and game.all_users.filter(user=user).exists():
                games.append(game)
                if len(games) == limit:
                    break

    # Return the games, ordered by start time (most recent first)
    print(games)
    return games