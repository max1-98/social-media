from games.models import Game
from .models import Elo
from math import cos, exp, pi, sin
from django.utils import timezone


# Calculates the probability of the user with elo1 of winning (using sigmoid function)
def prob_win(elo1,elo2):
    b = 0.01
    return 1/(1+exp(b*(elo2-elo1)))

# Calculates the value of the elo-change outcome given a probability of the team winning
def result(score_difference,p, game_type):

    if game_type == "badminton_doubles" or game_type == "badminton_singles":
        A = 42*p-21
        k = pi/(84*(sin(pi/84*(21-A))-sin(pi/84*(-21-A))))

        return 84*k/pi *(sin(pi/84*(score_difference-A))-sin(pi/84*(-21-A)))-0.5
    
    A = 42*p-21
    
    k = pi/(84*(sin(pi/84*(21-A))-sin(pi/84*(-21-A))))
    
    return 84*k/pi *(sin(pi/84*(score_difference-A))-sin(pi/84*(-21-A)))-0.5

def team1Win(score, game_type):
    """
    Determines if Team 1 won based on the score string.

    Args:
        score (str): The score string in the format "team1_score,team2_score".

    Returns:
        bool: True if Team 1 won, False otherwise.
    """
    team1_score, team2_score = map(int, score.split(","))
    if game_type == "badminton_doubles" or game_type == "badminton_singles":
        
        return team1_score > team2_score

    return team1_score > team2_score

def scoreDifference(score, game_type):
    if game_type == "badminton_doubles" or game_type == "badminton_singles":
        team1_score, team2_score = map(int, score.split(","))
        return abs(team1_score-team2_score)

    team1_score, team2_score = map(int, score.split(","))
    return abs(team1_score-team2_score)

def update_elo(score, game):

    k = 100
    game_type = game.game_type
    
    teamw = []
    teaml = []

    # Add the players from the winning team's Elo model for that game to the teamw list
    # likewise from the losing team to the teaml list

    players1 = game.team1.all()
    players2 = game.team2.all()

    if team1Win(score, game_type):
        
        for player in players1:
            teamw.append(player.user.elos.get(game_type=game_type))
        for player in players2:
            teaml.append(player.user.elos.get(game_type=game_type))
    else:
        for player in players2:
            teamw.append(player.user.elos.get(game_type=game_type))
        
        for player in players1:
            teaml.append(player.user.elos.get(game_type=game_type))
    

    # teamw elo average:
    elow = 0
    for elo in teamw:
        elow += elo.elo
    
    # teaml elo average
    elol = 0
    for elo in teaml:
        elol += elo.elo

    elow_average = elow / len(teamw)
    elol_average = elol / len(teaml)
    score_difference = scoreDifference(score, game_type)



    # probability winning team wins
    pw = prob_win(elow_average,elol_average)
    change_in_elo = result(score_difference, pw, game_type)
    for elo in teamw:

        elo.elo = int(elo.elo + k*change_in_elo)
        elo.winstreak = elo.winstreak + 1
        elo.last_game = timezone.now().date()



        if elo.winstreak >= elo.best_winstreak:

            elo.best_winstreak = elo.winstreak

        elo.save()
        elo.game_wins.add(game)
    
    # probability losing team wins
    pl = prob_win(elol_average,elow_average)
    change_in_elo = result(-score_difference, pl, game_type)

    for elo in teaml:
        elo.elo = int(elo.elo + k*change_in_elo)
        elo.winstreak = 0
        elo.last_game = timezone.now().date()
        elo.save()
        elo.game_loses.add(game)

    
        



