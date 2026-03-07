from games.models import Game
from elo.services import update_elo


def create_game_for_event(event, team1, team2):
    """Create a game, assign teams, move members from active to in-game.

    Args:
        event: Event instance
        team1: list of Member instances
        team2: list of Member instances

    Returns:
        Game instance
    """
    game = Game.objects.create(
        event=event,
        game_type=event.game_type,
    )

    for member in team1:
        game.team1.add(member)
        event.active_members.remove(member)
        event.in_game_members.add(member)

    for member in team2:
        game.team2.add(member)
        event.active_members.remove(member)
        event.in_game_members.add(member)

    event.games.add(game)
    event.save()
    game.save()
    return game


def complete_game(game, event, score):
    """Complete a game: validate score, update ELO, reactivate players, update stats.

    Args:
        game: Game instance
        event: Event instance
        score: str in format "score1,score2"

    Raises:
        ValueError: on invalid score format or values
    """
    try:
        team1_score, team2_score = map(int, score.split(","))
    except ValueError:
        raise ValueError("Invalid score format. Expected 'score1,score2'.")

    if not (team1_score >= 21 or team2_score >= 21):
        raise ValueError("Invalid score. Winning team must have 21 or more points.")

    game.score = score
    game.save()

    update_elo(score, game, event.sbmm)

    # Re-add players to active members
    event.active_members.add(*game.all_users.all())
    event.in_game_members.remove(*game.all_users.all())

    # Track players who have played at least one match
    for player in game.all_users.all():
        if player not in event.played_one_match.all():
            event.played_one_match.add(player)

    # Update stats
    event.update_player_match_counts(game)
    event.update_player_win_counts(game)
    event.update_player_social_counts(game)
    event.save()


def delete_game(game, event):
    """Delete a game: reactivate players, remove from event, delete.

    Args:
        game: Game instance
        event: Event instance

    Raises:
        ValueError: if game doesn't belong to event
    """
    if game not in event.games.all():
        raise ValueError("Game does not belong to this event.")

    players = list(game.team1.all()) + list(game.team2.all())
    event.active_members.add(*players)
    event.in_game_members.remove(*players)
    event.games.remove(game)
    event.save()
    game.delete()
