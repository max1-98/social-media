
import { Button, Grid2, Stack, Typography, TextField, Card, Chip, IconButton} from "@mui/material";
import { handleDeactivate } from "../../../functions/handles_functions";
import { fetchEvent, fetchGames } from "../../../functions/fetch_functions";
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from "axios";


function GameDisplay(props) {

    const { game, setGames, event, club, setEvent, setMembers, setAMembers, setInGameMembers, team1Score, team2Score, setTeam1Score, setTeam2Score} = props;

    const handleScoreChange = (team, newScore) => {
        if (team === 'team1') {
        setTeam1Score(parseInt(newScore, 10));
        } else {
        setTeam2Score(parseInt(newScore, 10));
        }
    };

    const handleDeleteGame = async(event_id, game_id) => {
        try {
          const token = localStorage.getItem('access_token');
          const headers = {
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json',
              accept: 'application/json',
          }
          const response = await axios.post(`http://127.0.0.1:8000/game/delete/`, 
          {
              event_id: event_id,
              game_id: game_id,
          },
          {headers}
        );
        fetchGames(event_id, setGames);
        fetchEvent(event_id, setEvent, setAMembers, setInGameMembers);
        } catch (error) {
          console.error('Error fetching event:', error);
        }
      };

    const handlePause = async(event_id, game_id, player_id) => {
        try {
          const token = localStorage.getItem('access_token');
          const headers = {
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json',
              accept: 'application/json',
          }
          const response = await axios.post(`http://127.0.0.1:8000/game/delete/`, 
          {
              event_id: event_id,
              game_id: game_id,
          },
          {headers}
        );
        handleDeactivate(player_id, event_id, setMembers, setEvent, setAMembers, setInGameMembers)
        fetchGames(event_id, setGames);
      
        } catch (error) {
          console.error('Error fetching event:', error);
        }
       };

    const handleSubmitScore = async (event, game_id, event_id) => {
        event.preventDefault(); 
        
      
        try {
          const token = localStorage.getItem('access_token');
          const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            accept: 'application/json',
          };
          
          // Validate score before submitting
          if (team1Score >= 21 || team2Score >= 21) {
            const scoreString = `${team1Score},${team2Score}`; 
            
            await axios.post(
              `http://127.0.0.1:8000/game/complete/`,
              { 
                game_id: game_id, 
                event_id: event_id, 
                score: scoreString 
              }, 
              { headers }
            );
            fetchEvent(event_id, setEvent, setAMembers, setInGameMembers);
            fetchGames(event_id, setGames);
            setTeam1Score(0)
            setTeam2Score(0)
          } else {
            console.error('Invalid score. Winning team must have 21 or more points.');
          }
        } catch (error) {
          console.error('Error saving score:', error);
        }
      };

    return(
        <Grid2 item size={{ xs: 6, md:4, lg: 3 }} key={game.id}>
            <Card variant="outlined">
                <Stack  p={1} 
                        spacing={0.3} 
                        m={1}
                >
                    {game.team1.map((player) => ( 
                        <>
                            { club.is_club_admin && (
                                <Chip
                                    size={"medium"}
                                    deleteIcon={<PauseCircleOutlineIcon/>} 
                                    onDelete={() => handlePause(event.id, game.id, player.id)}
                                    deleteIconPlacement="right"
                                    label={`${player.first_name} ${player.surname} (${player.elo})`} 
                                    variant="outlined" 
                                    sx={{
                                        borderColor: "secondary.dark",
                                        color: "secondary.main",
                                        padding: '0', 
                                        margin: '0', 
                                        '& .MuiChip-deleteIcon': { 
                                          marginLeft: 'auto', // Move delete icon to the right
                                        }
                                      }}
                                />
                            )}
                            { !club.is_club_admin && (
                            <Chip
                                size={"medium"}
                                color={"#000"}
                                label={`${player.first_name} ${player.surname} (${player.elo})`} 
                                variant="outlined" 
                                sx={{
                                    borderOutline: "red",
                                    padding: '0', 
                                    margin: '0' 
                                }}
                            />
                            )}
                        </> 
                            
                    ))} 
                </Stack>
                <Stack p={1} spacing={0.3} m={1} 
                            >
                    {game.team2.map((player) => (
                        <>
                            { club.is_club_admin && (
                                <Chip
                                    size={"medium"}
                                    deleteIcon={<PauseCircleOutlineIcon/>} 
                                    onDelete={() => handlePause(event.id, game.id, player.id)}
                                    deleteIconPlacement="right"
                                    label={`${player.first_name} ${player.surname} (${player.elo})`} 
                                    variant="outlined" 
                                    sx={{
                                        padding: '0', 
                                        margin: '0', 
                                        borderColor: "terniary.dark",
                                        color: "terniary.main",
                                        '& .MuiChip-deleteIcon': { 
                                        marginLeft: 'auto', // Move delete icon to the right
                                        }
                                    }}
                                />
                            )}
                            { !club.is_club_admin && (
                            <Chip
                                size={"medium"}
                                color={"red"}
                                label={`${player.first_name} ${player.surname} (${player.elo})`} 
                                variant="outlined" 
                                sx={{
                                    padding: '0', 
                                    margin: '0' ,
                                    borderColor: "terniary.dark",
                                    color: "terniary.main",
                                }}
                            />
                            )}
                        </> 
                    ))}
                </Stack> 
                
                {/* Submit score form */}
                {club.is_club_admin && (
                <form onSubmit={(e) => handleSubmitScore(e, game.id, event.id)}>
                    <Grid2 container spacing={1} sx={{margin:1}}>
                        <Grid2 item size={6}>
                        <TextField
                            type="number"
                            value={team1Score}
                            onChange={(e) => handleScoreChange('team1', e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{
                                input: { color: 'primary', fontWeight: 'bold'},
                                borderRadius: '10px',
                                height: 'auto',   
                                
                            }}
                        />
                        </Grid2>
                        <Grid2 item size={6}>
                            <TextField
                            type="number"
                            value={team2Score}
                            onChange={(e) => handleScoreChange('team2', e.target.value)}
                            inputProps={{ min: 0 }}
                            sx={{
                                input: { color: 'secondary', fontWeight: 'bold'},
                                borderRadius: '10px',
                                height: 'auto',   
                            }}
                            />
                        </Grid2>
                    </Grid2>
                    <Grid2 container sx={{margin:1}} spacing={1}>
                        <Grid2 item size={6}> 
                            <Button 
                                onClick={() => handleDeleteGame(event.id, game.id)}
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                sx = {{width: "100%", height:"100%"}}
                            ></Button>
                        </Grid2>  

                        <Grid2 item size={6}>
                            <Button variant="contained" type="submit" sx = {{width: "100%", height:"100%"}} color={"success"}>
                                Submit
                            </Button>
                        </Grid2>  
                    </Grid2>
                </form>
                )}
            </Card>
        </Grid2>
    )
};

export default GameDisplay;