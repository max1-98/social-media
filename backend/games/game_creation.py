import random
import math
from clubs.models import Member

# Function for returning a player's adjusted Elo given a Member instance and game_type
def player_elo(player, game_type):

    # Get's the Elo model
    Elo = player.user.elos.get(game_type=game_type)

    raw_elo = Elo.elo
    winstreak = Elo.winstreak

    if winstreak < 3:
        return raw_elo
    elif winstreak < 6:
        return raw_elo+50
    elif winstreak < 10:
        return raw_elo+100
    else:
        return raw_elo+200

# Function that decreases to 0 for simulated annealing
def f(x):
    return 1/x

# Finds the energy (total elo) diff between two teams
def energy_diff(T_1, T_2, players):

    T_1_elo = sum([players[str(p)] for p in T_1])
    T_2_elo = sum([players[str(p)] for p in T_2])

    return abs(T_2_elo-T_1_elo)

# Function for sorting a list of players into even teams using simulated annealing
def even_teams(players, game_type=None ,m=1, k=0.5 , T=f, n=50):
    """
        Args:
            players: dict {player_id: Elo}
            m: integer >= 1
            k: float, 0<k<1
            T: function that decreases towards 0
            n: number of iterations
        
        Output: (T1, T2), where T1 and T2 are arrays of player_ids

        # NOTE we could easily make the teams perfectly balanced using n, but this will slow down the updates for players
    """
    
    if game_type:
        players1 = players.copy()
        players = {}
        for player in players1:
            players[str(player.id)] = player_elo(player, game_type)

    # Randomly select teams m times
    E = 0
    players_list = list(players.keys())
    team_size = int(len(players_list)/2)

    for i in range(m):
        T_1 = players_list.copy()
        T_2 = []

        for i in range(team_size):

            new_player = random.choice(T_1)
            T_2.append(new_player)
            T_1.remove(new_player)
        
        E_1 = energy_diff(T_1, T_2, players)

        if E_1 >= E:
            E=E_1
            T_1_store = T_1.copy()
            T_2_store = T_2.copy()
    
    # Now randomly move people across.
    if int(team_size*k) - team_size*k== 0:
        b = int(team_size*k)
    else:
        b = int(team_size*k//1+1)

    for i in range(1,n+1):
        T_1 = T_1_store.copy()
        T_2 = T_2_store.copy()

        T_1_remove = random.sample(T_1, b)
        T_2_remove = random.sample(T_2, b)

        for item in T_1_remove:
            T_2.append(item)
            T_1.remove(item)
        
        for item in T_2_remove:
            T_1.append(item)
            T_2.remove(item)
        
        E_1 = energy_diff(T_1, T_2, players)

        if E_1 < E or math.exp(-E_1 / T(i)):
            E=E_1
            T_1_store = T_1.copy()
            T_2_store = T_2.copy()
    
    return (T_1_store, T_2_store) 
 
# Finish, simplify code and involve even_teams function, when converting people into dict form
# adjust people's Elo based on their winstreak (ie. if on a 5 winstreak give them an Elo multiplier)
def mixed_sbmm(player_1, game_type, active_members):
        
    """
        Args:
            - Player_1: Member instance
            - game_type: GameType instance
            - active_members: Member QuerySet

        Returns:
            - (T1, T2), where T1 and T2 are lists of Member instances

        Process:
            1. Takes player 1 (the player who has played the least)

            2. Asserts gender of player 1.

            3. Finds the closest 2 elo's of members from the same gender as player 1.

            4. Picks 1 randomly from this set.

            5. Then picks closest 4 of the opposite gender.

            6. Picks 2 randomly from this set.

            7. Then assigns the teams fairly.
    """

        
    player_1_gender = player_1.user.biological_gender
    player_1_elo = player_elo(player_1, game_type)
    T_1 = [player_1]
    potential_players = active_members.filter(user__biological_gender=player_1_gender).exclude(pk=player_1.pk)

    if len(potential_players)<3:
        closest_players = potential_players
    else:
        closest_players = sorted(
            potential_players,
            key=lambda player: abs(player_elo(player, game_type)-player_1_elo)
        )[:2]

    T_2 = [random.choice(closest_players)]

    opposite_gender = 'female' if player_1_gender == 'male' else 'male'
    potential_players2 = active_members.filter(user__biological_gender=opposite_gender)

    if len(potential_players) < 5:
        closest_players2 = potential_players2
    else:
        closest_players2 = sorted(
            potential_players2,
            key=lambda player: abs(player_elo(player, game_type) - player_1_elo)
        )[:4]

    closest_players2 = list(closest_players2)
    player3 = random.choice(closest_players2)
    closest_players2.remove(player3)
    player4 = random.choice(closest_players2)

    if player_elo(T_1[0], game_type) > player_elo(T_2[0], game_type):

        if player_elo(player3, game_type) > player_elo(player4, game_type):
            T_1.append(player4)
            T_2.append(player3)
        else:
            T_1.append(player3)
            T_2.append(player4)
    else:
        if player_elo(player3, game_type) > player_elo(player4, game_type):
            T_2.append(player4)
            T_1.append(player3)
        else:
            T_2.append(player3)
            T_1.append(player4)
    
    return [T_1, T_2]

def sbmm(player_1, active_members, team_size, game_type):
    """
    Args:
        - player_1: Member instance
        - active_members: QuerySet of Member instances
        - team_size: Positive integer
        - game_type: GameType instance

    Output:
        - (T_1, T_2), where T_1 and T_2 are lists of Member IDs

    Process:
        Handles non-mixed match generation

        1. Finds closest 2*n+1 to player 1 Elo wise 

        2. Picks randomly out of this grouping 

        3. Chooses smallest difference pairing in average elo out of those. 

        (For large team_size approximates smallest difference pairing using Simulated Annealing)
    """

    potential_players = active_members.exclude(pk=player_1.pk)  # Exclude player_1
    player_1_elo = player_elo(player_1, game_type)

    if potential_players.count() > 2*team_size+1:

        # Select the 2n+1 closest players
        closest_players = sorted(
            potential_players,
            key=lambda player: abs(player_elo(player, game_type)-player_1_elo)
        )[:2*team_size + 1]
    else:
        # All available players are the closest players
        closest_players = list(potential_players)

    i = 0
    
    players = [player_1]
    closest_players = list(closest_players)
    
    
    # Randomly choose from closest_players and append the players to a new list: players
    while len(players) < 2*team_size and i < 2*team_size:
        player = random.choice(closest_players)
        players.append(player)
        closest_players.remove(player)
        i += 1

    players_dict = {}
    for player in players:
        players_dict[str(player.id)] = player_elo(player, game_type)
    
    # if there are only two people playing then split them up into team1 and team2
    if team_size == 1:
        return ([players[0].id], [players[1].id])
    
    Ts = even_teams(players_dict)
    T_1= [Member.objects.get(id=p) for p in Ts[0]]
    T_2 = [Member.objects.get(id=p) for p in Ts[1]]
    
    return (T_1, T_2)

def social_count(player_1, players, played_with):
    """
        Args:
            - player_1: Member instance
            - players: List of Mmeber instances
            - played_with: Nested dictionary for measuring how many times people have played together
    """
    store = 0

    def G(x):
        # +1 and squaring to make people playing with other players they have already played with more expensive.
        return (x+1)**3

    pw1 = played_with.get(str(player_1.id), {})

    for player in players:
        store += G(pw1.get(str(player.id), 0))
    
    for player in players:
        pw1 = played_with.get(str(player.id), {})

        for player1 in players:
            store += G(pw1.get(str(player1.id), 0))
    
    return store

def social(player_1, active_members, played_with, team_size, game_type, et, m=1, k=0.2, T=f, n=10):

    if 2*team_size == len(active_members)+1:
        players = list(active_members)
        players.append(player_1)

        if team_size == 1:
            return ([players[0].id], [players[1].id])
        else:
            if et:
                return even_teams(players, game_type)
            else:
                team1 = random.sample(players, team_size)

                for player in team1:
                    players.remove(player)
                
                return (team1, players)
    
    E = -1

    for i in range(m):
        players = random.sample(active_members, 2*team_size-1)
        E_1 = social_count(player_1, players, played_with)

        if E_1 > E:
            E = E_1
            players_store = players.copy()
    
    if int(team_size*k) - team_size*k== 0:
        b = int(team_size*k)
    else:
        b = int(team_size*k//1+1)


    for player in players_store:
        active_members.remove(player)
    

    for i in range(1,n+1):

        players = players_store.copy()
        removals = random.sample(players, b)
        additions = random.sample(active_members, b)
       
        for j in range(b):
            players.remove(removals[j])
            players.append(additions[j])

        E_1 = social_count(player_1, players, played_with)
        if E_1 < E or math.exp(-E_1 / T(i)) > 0.5:
            E = E_1

            for j in range(b):
                active_members.append(removals[j])
                active_members.remove(additions[j])

            players_store = players.copy()
            
    
    if et:
        players.append(player_1)
        T_1, T_2 = even_teams(players, game_type)
        return ([p for p in T_1], [p for p in T_2]) # returns two lists of Member instances
    else:
        players.append(player_1)
        T_1=random.sample(players, team_size)

        for player in T_1:
            players.remove(player)

        return (T_1, players) # returns two lists of Member instances







