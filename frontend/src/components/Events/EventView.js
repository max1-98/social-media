import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom'; // Import useParams
import { game_columns, membercolumns } from './consts/columns';
import DeleteIcon from '@mui/icons-material/Delete';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import { Button, Grid2, Box, Typography, TextField } from '@mui/material';
import Member_table from '../tables/scroll_table';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';

import { fetchClub, fetchCompleteEventGames, fetchEvent, fetchGames, fetchMembers } from '../functions/fetch_functions';
import { handleActivate, handleDeactivate } from '../functions/handles_functions';
import Game_table from '../tables/game_display_table';

function EventPage() {
  const [club, setClub] = useState(null);
  const [event, setEvent] = useState([]);
  const [amembers, setAMembers] = useState([]);
  const [members, setMembers] = useState([]);
  const [in_game_members, setInGameMembers] = useState([]);
  const [games, setGames] = useState([]);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [open, setOpen] = useState(false); // State for dialog
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [error, setError] = useState(null);
  const [gender, setGender] = useState('');
  const [completeGames, setCGames] = useState([]);

  const handleScoreChange = (team, newScore) => {
    if (team === 'team1') {
      setTeam1Score(parseInt(newScore, 10));
    } else {
      setTeam2Score(parseInt(newScore, 10));
    }
  };

  const { clubId } = useParams(); // Get clubId from the URL
  const { eventId } = useParams(); // Get eventId from the URL
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [page1, setPage1] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangePage1 = (event, newPage) => {
    setPage1(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleStart = async(event_id) => {
    
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          accept: 'application/json',
      }
      const response = await axios.post(`http://127.0.0.1:8000/club/event/start/`, 
      {
          event_id: event_id,
      },
      {headers}
    );
    fetchEvent(event_id, setEvent, setAMembers, setInGameMembers);
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const handleComplete = async(event_id) => {
    
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          accept: 'application/json',
      }
      const response = await axios.post(`http://127.0.0.1:8000/club/event/complete/`, 
      {
          event_id: event_id,
      },
      {headers}
    );
    fetchEvent(event_id, setEvent, setAMembers, setInGameMembers);
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const handleCreateGame = async(event_id) => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          accept: 'application/json',
      }
      const response = await axios.post(`http://127.0.0.1:8000/game/create/`, 
      {
          event_id: event_id,
      },
      {headers}
    );
    fetchGames(event_id, setGames);
    fetchEvent(event_id, setEvent, setAMembers, setInGameMembers);
    } catch (error) {
      console.error('Error fetching event:', error);
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
    } else {
      console.error('Invalid score. Winning team must have 21 or more points.');
    }
  } catch (error) {
    console.error('Error saving score:', error);
  }
};

const handleCreateMember = async () => {
  try {
    const token = localStorage.getItem('access_token');
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      accept: 'application/json',
    };

    const response = await axios.post(
      `http://127.0.0.1:8000/club/dummy-user/create/${clubId}/`, 
      {
        first_name: firstName,
        surname,
        biological_gender: gender // Include gender in the request
      }, 
      { headers }
    );
    console.log(response.data);
    if (club.is_club_admin){
      fetchMembers(eventId, setMembers);
    }
    handleClose(); // Close the dialog
  } catch (error) {
    setError(error.response.data.detail || 'Error creating dummy user.');
    console.error('Error creating dummy user:', error);
  }
};

const handleChangeGender = (event) => {
  setGender(event.target.value);
};

const handleClickOpen = () => {
  setOpen(true);
};

const handleClose = () => {
  setOpen(false);
  setFirstName('');
  setSurname('');
  setError(null); // Clear error after dialog is closed
};

const handleChangeFirstName = (event) => {
  setFirstName(event.target.value);
};

const handleChangeSurname = (event) => {
  setSurname(event.target.value);
};

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch the event data
        const eventResponse = await fetchEvent(eventId, setEvent, setAMembers, setInGameMembers);
        
        // Fetch the club data
        await fetchClub(clubId, setClub);

        // Fetch the games data
        await fetchGames(eventId, setGames);

        // Fetch the members
        await fetchMembers(eventId, setMembers);

        await fetchCompleteEventGames(eventId, setCGames);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
      }
    };

    if (eventId) {
      fetchData();
    }
  }, [eventId]); 
  if (club) {
  return (
    
    <> 
      <div>
          
            {!event.event_active && club.is_club_admin && (
              
              <>
                <Button onClick={() => handleStart(event.id)}>Start event</Button>
              </>
            )}
            {event.event_active && !event.event_complete && (

              <>
                { club.is_club_admin && (
                <Button onClick={() => handleComplete(event.id)} color="success" variant='contained'>Complete event</Button>
                )}
                <Grid2 container spacing={2}>
                  {games.map((game) => (
                    <Grid2 item xs={3} key={game.id}>
                      
                        {game.team1.map((player) => (
                          <Box
                          sx={{
                            height: '50px', // Adjust height as needed
                            color: 'white',
                            backgroundColor: '#0000FF',
                            border: '1px solid #ddd',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                          >
                            <Typography>{player.first_name} {player.surname} <i>({player.elo})   </i> 
                            { club.is_club_admin && (
                              <Button 
                                onClick={() => handlePause(event.id, game.id, player.id)}
                                variant="text" 
                                sx={{
                                  color: 'white',
                                }}
                                startIcon={<PauseCircleOutlineIcon />}
                              >
                              </Button>
                            )}
                            </Typography>
                          </Box>
                        ))} 
                        {game.team2.map((player) => (
                          <Box
                          sx={{
                            height: '50px', // Adjust height as needed
                            color: 'white',
                            backgroundColor: '#008000',
                            border: '1px solid #ddd',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                          >
                            <Typography>{player.first_name} {player.surname} <i>({player.elo})   </i> 
                            { club.is_club_admin && (
                              <Button 
                                onClick={() => handlePause(event.id, game.id, player.id)}
                                variant="text" 
                                sx={{
                                  color: 'white',
                                }}
                                startIcon={<PauseCircleOutlineIcon />}
                              >
                              </Button>
                            )}
                            </Typography>
                          </Box>
                        ))} 
                          {/* Submit score form */}
                          {club.is_club_admin && (
                          <form onSubmit={(e) => handleSubmitScore(e, game.id, event.id)}>
                            <Grid2 container spacing={1}>
                              <Grid2 item xs={4}>
                                <Typography variant="h6" gutterBottom>
                                  Team 1
                                </Typography>
                                <TextField
                                  type="number"
                                  value={team1Score}
                                  onChange={(e) => handleScoreChange('team1', e.target.value)}
                                  inputProps={{ min: 0 }}
                                />
                              </Grid2>
                              <Grid2 item xs={4}>
                                <Typography variant="h6" gutterBottom>
                                  Team 2
                                </Typography>
                                <TextField
                                  type="number"
                                  value={team2Score}
                                  onChange={(e) => handleScoreChange('team2', e.target.value)}
                                  inputProps={{ min: 0 }}
                                />
                              </Grid2>
                              <Grid2 item xs={4} sx={{ mt: 2 }}>
                                <Grid2 container direction="column" alignItems="center" spacing={1}>
                                  <Button 
                                    onClick={() => handleDeleteGame(event.id, game.id)}
                                    variant="outlined"
                                    color="error"
                                    startIcon={<DeleteIcon />}
                                  ></Button>
                                  <Button variant="contained" type="submit">
                                    Submit
                                  </Button>
                                </Grid2>
                              </Grid2>
                            </Grid2>
                          </form>
                          )}
                    </Grid2>
                  ))}

                    {/* Create game button */}
                    { club.is_club_admin && (
                    <Grid2 item xs={3}>
                      <Box
                        x={{
                          height: '200px', // Adjust height as needed
                          backgroundColor: '#f0f0f0',
                          border: '1px solid #ddd',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                        <Button onClick={() => handleCreateGame(event.id)} variant="outlined" color="success">Create game</Button>
                      </Box>
                    </Grid2>
                    )}
                </Grid2>
          
          {/* Table for Active Members */}
          {/* Create Member Button */}
          {club.is_club_admin && (
          <> 
          <Button variant="contained" onClick={handleClickOpen}>
            Create Member
          </Button>
          {/* Create Member Dialog */}
          <Dialog open={open} onClose={handleClose}>
            <DialogTitle>Create New Member</DialogTitle>
            <DialogContent>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                autoFocus
                margin="dense"
                id="first_name"
                label="First Name"
                fullWidth
                value={firstName}
                onChange={handleChangeFirstName}
              />
              <TextField
                margin="dense"
                id="surname"
                label="Surname"
                fullWidth
                value={surname}
                onChange={handleChangeSurname}
              />

            <FormControl component="fieldset" margin="dense" fullWidth>
            <FormLabel component="legend">Biological Gender</FormLabel>
            <RadioGroup
              aria-label="gender"
              name="gender"
              value={gender}
              onChange={handleChangeGender}
            >
              <FormControlLabel 
                value="male" 
                control={<Radio />} 
                label="Male" 
              />
              <FormControlLabel 
                value="female" 
                control={<Radio />} 
                label="Female" 
              />
            </RadioGroup>
        </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Cancel</Button>
              <Button onClick={handleCreateMember}>Create</Button>
            </DialogActions>
          </Dialog>
                {Member_table(
                  membercolumns,
                  'Active Members',
                  'Deactivate',
                  members.filter(member => 
                    amembers.some(amember => amember.id === member.id) 
                  ),
                  handleDeactivate,
                  page,
                  rowsPerPage,
                  handleChangePage, 
                  handleChangeRowsPerPage,
                  setMembers, 
                  setEvent, 
                  setAMembers, 
                  setInGameMembers,
                  eventId,
                )}

                {/* Table for Remaining Members */}
                {Member_table(
                  membercolumns,
                  'Inactive Members',
                  'Activate',
                  members.filter(member => 
                    !amembers.some(amember => amember.id === member.id) && 
                    !in_game_members.some(gameMember => gameMember.id === member.id) 
                  ),
                  handleActivate,
                  page1,
                  rowsPerPage,
                  handleChangePage1, 
                  handleChangeRowsPerPage,
                  setMembers, 
                  setEvent, 
                  setAMembers, 
                  setInGameMembers,
                  eventId,
                )}
              </>)}
              </>
              
            )}
      </div>
      { event.event_complete && (
        <>
        {Game_table(
          game_columns,
          completeGames, 
          page,
          rowsPerPage,
          handleChangePage,
          handleChangeRowsPerPage,
        )}
        </>
      )}

      
    </>

  );
}
else {
  <h1>Loading...</h1>
}
}

export default EventPage;
