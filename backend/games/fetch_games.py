from django.db.models import Q
from events.models import Event
from games.models import Game

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
    games = Game.objects.filter(
        all_users__user=user,
        score__isnull=False,
    ).select_related('game_type').prefetch_related('all_users') \
    .order_by('-start_time')

    if game_type:
        games = games.filter(game_type=game_type)

    return games[:limit]
