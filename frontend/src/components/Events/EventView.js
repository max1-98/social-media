import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom'; // Import useParams
import { membercolumns } from './consts/columns';

import { Button, Grid, Box, Typography, TextField } from '@mui/material';
import Member_table from '../tables/scroll_table';


function EventPage() {
  const [club, setClub] = useState(null);
  const [event, setEvent] = useState([]);
  const [amembers, setAMembers] = useState([]);
  const [members, setMembers] = useState([]);
  const [games, setGames] = useState([]);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);

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
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [courts, setCourts] = useState([]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const fetchEvent = async (event_id) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`http://127.0.0.1:8000/club/event/${event_id}/`, {
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        accept: 'application/json',
      }
    });
    setEvent(response.data);
    console.log(event)
    setAMembers(response.data.active_members);
    console.log(response.data)
    
    
    } catch (error) {
        console.error('Error fetching event:', error);
    }
  };

  const fetchClub = async (club_id) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`http://127.0.0.1:8000/club/${club_id}/`, {
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        accept: 'application/json',
      }
    });
    setClub(response.data);
    } catch (error) {
      console.error('Error fetching club:', error);
    }
  };

  const fetchGames = async (event_id) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`http://127.0.0.1:8000/game/games/${event_id}`, {
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        accept: 'application/json',
      }
    });
    setGames(response.data);
    } catch (error) {
      console.error('Error fetching club:', error);
    }

  };

  const fetchMembers = async (club_id) => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/club/members/${club_id}/`, {
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('access_token'),
          'Content-Type': 'application/json',
          accept: 'application/json',
      }
      }); 
      setMembers(response.data); // Update the state with all clubs
    } catch (error) {
      console.error('Error fetching clubs:', error);
    }
  };

  const handleActivate = async (memberId) => {
    try {
        const token = localStorage.getItem('access_token');
        const headers = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
        }
        const response = await axios.post(`http://127.0.0.1:8000/club/event/activate-member/`, 
        {
            user: memberId,
            event: eventId,
        },
        {headers}
      );
      fetchEvent(eventId);
      fetchMembers(clubId)
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const handleDeactivate = async (memberId) => {
    try {
        const token = localStorage.getItem('access_token');
        const headers = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
        }
        const response = await axios.post(`http://127.0.0.1:8000/club/event/deactivate-member/`, 
        {
            user: memberId,
            event: eventId,
        },
        {headers}
      );
      fetchEvent(eventId);
      fetchMembers(clubId)
    } catch (error) {
      console.error('Error fetching event:', error);
    }
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
          event: event_id,
      },
      {headers}
    );
    fetchEvent(event_id);
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
          event: event_id,
      },
      {headers}
    );
    fetchEvent(event_id);
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
    fetchGames(event_id);
    fetchEvent(event_id);
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
    fetchGames(event_id);
    fetchEvent(event_id);
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
  handleDeactivate(player_id)
  fetchGames(event_id);

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
      fetchEvent(event_id);
      fetchGames(event_id);
    } else {
      console.error('Invalid score. Winning team must have 21 or more points.');
    }
  } catch (error) {
    console.error('Error saving score:', error);
  }
};

  

  useEffect(() => {
    if (eventId) {
      fetchEvent(eventId);
      fetchClub(clubId);
      fetchMembers(clubId);
      fetchGames(eventId);
    }
  }, [event.number_of_courts]);


  return (
    
    <> 
      <div>
        
            {!event.event_active && (
              <>
                <Button onClick={() => handleStart(event.id)}>Start event</Button>
              </>
            )}
            {event.event_active && !event.event_complete && (

              <>
                <Button onClick={() => handleComplete(event.id)}>Complete event</Button>
                <Grid container spacing={2}>
                  {games.map((game) => (
                    <Grid item xs={3} key={game.id}>
                      
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
                            <Button onClick={() => handlePause(event.id, game.id, player.id)}
                            variant="contained" // Use "contained" for a filled button
                            sx={{
                              backgroundColor: 'black', // Black background
                              borderRadius: '5px', // Curved edges
                              color: 'white', // White text
                              padding: '1px',
                            }}>
                            Pause
                            </Button>
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
                            <Button 
                            onClick={() => handlePause(event.id, game.id, player.id)}
                            variant="contained" // Use "contained" for a filled button
                            sx={{
                              backgroundColor: 'black', // Black background
                              borderRadius: '5px', // Curved edges
                              color: 'white', // White text
                              padding: '1px',
                            }}>
                            Pause
                            </Button>
                            </Typography>
                          </Box>
                        ))} 
                        <Button 
                          onClick={() => handleDeleteGame(event.id, game.id)}
                          variant="contained" // Use "contained" for a filled button
                          sx={{
                            backgroundColor: 'black', // Black background
                            borderRadius: '10px', // Curved edges
                            color: 'white', // White text
                            padding: '4px',
                          }}
                          >
                            Delete Game
                          </Button>
                          <form onSubmit={(e) => handleSubmitScore(e, game.id, event.id)}>
                            <Grid container spacing={1}>
                              <Grid item xs={4}>
                                <Typography variant="h6" gutterBottom>
                                  Team 1
                                </Typography>
                                <TextField
                                  type="number"
                                  value={team1Score}
                                  onChange={(e) => handleScoreChange('team1', e.target.value)}
                                  inputProps={{ min: 0 }}
                                />
                              </Grid>
                              <Grid item xs={4}>
                                <Typography variant="h6" gutterBottom>
                                  Team 2
                                </Typography>
                                <TextField
                                  type="number"
                                  value={team2Score}
                                  onChange={(e) => handleScoreChange('team2', e.target.value)}
                                  inputProps={{ min: 0 }}
                                />
                              </Grid>
                              <Grid item xs={4}>
                                <Button variant="contained" type="submit">
                                  Submit Game
                                </Button>
                              </Grid>
                            </Grid>
                          </form>
                    </Grid>
                  ))}
                    <Grid item xs={3}>
                      <Box
                        x={{
                          height: '200px', // Adjust height as needed
                          backgroundColor: '#f0f0f0',
                          border: '1px solid #ddd',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                        <Button onClick={() => handleCreateGame(event.id)}>Add a game</Button>
                      </Box>
                    </Grid>
                </Grid>
                {/* Table for Active Members */}
                {Member_table(
                  membercolumns,
                  'Active Members',
                  'Deactivate',
                  amembers,
                  handleDeactivate,
                  page,
                  rowsPerPage,
                  handleChangePage, 
                  handleChangeRowsPerPage
                )}

                {/* Table for Remaining Members */}
                {Member_table(
                  membercolumns,
                  'Inactive Members',
                  'Activate',
                  members.filter(
                    (member) => !amembers.some((amember) => amember.id === member.id)
                  ),
                  handleActivate,
                  page,
                  rowsPerPage,
                  handleChangePage, 
                  handleChangeRowsPerPage
                )}
              </>
              
            )}
      </div>

      
    </>

  );
}

export default EventPage;
