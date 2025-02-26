import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom'; // Import useParams
import { game_columns} from './consts/columns';
import { Button, Card, Chip, Grid2, Paper, Typography, useMediaQuery, useTheme  } from '@mui/material';

import { fetchClub, fetchCompleteEventGames, fetchEvent, fetchGames, fetchMembers, fetchStats } from '../functions/fetch_functions';
import Game_table from '../tables/game_display_table';
import BeforeStart from './EventViewComponents/BeforeStart';
import ActiveEvent from './EventViewComponents/ActiveEvent';

function EventPage() {

  // Constants for Game view top Navbar
  const [anchorElNav, setAnchorElNav] = useState(null);

  // Constants for club / event and game info
  const { clubId } = useParams(); // Get clubId from the URL
  const { eventId } = useParams(); // Get eventId from the URL
  const [club, setClub] = useState(null);
  const [event, setEvent] = useState([]);
  const [amembers, setAMembers] = useState([]);
  const [members, setMembers] = useState([]);
  const [in_game_members, setInGameMembers] = useState([]);
  const [games, setGames] = useState([]);
  const [completeGames, setCGames] = useState([]);
  const [stats, setStats] = useState([]);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  // Open and Close Dialog constants
  const [open, setOpen] = useState(false); // State for dialog
  const [openSettingsDialog, setOpenSettingsDialog] = useState(false);
  const [openPegDialog, setOpenPegDialog] = useState(false);
  const [openAppBar, setOpenAppBar] = useState(false);

  // Peg board constants
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [player1Id, setplayer1Id] = useState([]);

  // For changing game mode
  const [eventSettings, setEventSettings] = useState({
    sbmm: event.sbmm || true, // Use default value if event.sbmm is not available
    mode: event.mode || 'sbmm', // Use default value if event.mode is not available
    evenTeams: event.even_teams || true // Use default value if event.even_teams is not available
  });

  // Adding a member constants
  const [memberInfo, setMemberInfo] = useState({
    firstName: '',
    surname: '',
    gender: '',
  })
  
  // Team score constants
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  

  // For displaying errors
  const [error, setError] = useState(null);

  // Table constants
  const [page, setPage] = useState(0);
  const [page1, setPage1] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [page2, setPage2] = useState(0);
  const [rowsPerPage2, setRowsPerPage2] = useState(10);

  const handleChangePage2 = (event, newPage) => {
    setPage2(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage2(parseInt(event.target.value, 10));
    setPage2(0);
  };

  // Can Delete after complete view made
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
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch the event data
        await fetchEvent(eventId, setEvent, setAMembers, setInGameMembers);
        
        // Fetch the club data
        await fetchClub(clubId, setClub);

        // Fetch the games data
        await fetchGames(eventId, setGames);

        // Fetch the members
        await fetchMembers(eventId, setMembers);

        // Fetch the complete games
        await fetchCompleteEventGames(eventId, setCGames);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (eventId) {
      fetchData();
    }
  }, [eventId]); 

  useEffect(() => { 
    if (event.event_complete){
      fetchStats(eventId, setStats)
    };

  }, [event.event_complete]);
  
  if (club) {
  return (
    <Paper sx={{p:1}}> 
        {!event.event_active && club.is_club_admin && (
          <>
            {BeforeStart( 
                          event,
                          setEvent, 
                          setAMembers, 
                          setInGameMembers)
            }
          </>
        )}
        {event.event_active && !event.event_complete && (
          <>
            {ActiveEvent( 
                          event, 
                          club, 
                          games, 
                          members, 
                          amembers, 
                          in_game_members, 
                          setEvent, 
                          setAMembers, 
                          setInGameMembers, 
                          setMembers,
                          setGames,
                          team1Score, 
                          setTeam1Score,
                          team2Score,
                          setTeam2Score,
                          open, 
                          setOpen,
                          memberInfo,
                          setMemberInfo,
                          error, 
                          setError,
                          page, 
                          setPage,
                          page1, 
                          setPage1,
                          rowsPerPage, 
                          setRowsPerPage, 
                          openSettingsDialog, 
                          setOpenSettingsDialog,
                          eventSettings,
                          setEventSettings,
                          openPegDialog, 
                          setOpenPegDialog,
                          selectedMembers, 
                          setSelectedMembers, 
                          player1Id, 
                          setplayer1Id,
                          isSmallScreen,
                          openAppBar, 
                          setOpenAppBar,
                          
            )}
          </>
        )}

      { event.event_complete && stats.best_winstreak_players && (
        <>
        <Button onClick={()=>handleComplete(eventId)} color="secondary" variant={"outlined"}>Re-activate</Button>
        <Card sx={{p:1, mt:1, mb:1}}>
          <Typography variant={"h4"} sx={{textAlign: "center"}}> Key Stats</Typography>
          { stats ? (
            <Grid2 container spacing={1} sx={{mt:1}}>
              {stats.best_winstreak_players[0] && (
              <Grid2 item size={{xs:6, lg: 3}} >
                <Card sx={{padding: 1}} variant="outlined">
                  <Typography variant='h6' sx={{fontWeight:600}}>Best winstreak! ({stats.best_winstreak_players[0].best_winstreak})</Typography>
                  {stats.best_winstreak_players.map( (player,index) => (
                    <>
                      <Typography>{player.name}</Typography>
                      
                    </>
                  ))}
                </Card>
              </Grid2>)}
              { stats.highest_win_rate_players[0] &&(
              <Grid2 item size={{xs:6, lg: 3}}>
                <Card sx={{padding: 1}} variant="outlined">
                  <Typography variant='h6' sx={{fontWeight:600}}>Best win-rate! ({Math.ceil(stats.highest_win_rate_players[0].win_rate*100)/100} W/L)</Typography>
                  {stats.highest_win_rate_players.map( (player,index) => (
                        <Typography>{player.name}</Typography>
                      ))}
                </Card>
              </Grid2>
              )}
              { stats.highest_elo_gain_players[0] && (
                <Grid2 item size={{xs:6, lg: 3}}>
                  <Card sx={{padding: 1}} variant="outlined">
                    <Typography variant='h6' sx={{fontWeight:600}}>Most elo-gained! ({stats.highest_elo_gain_players[0].elo_gain} elo gained)</Typography>
                    {stats.highest_elo_gain_players.map( (player,index) => (
                          <>
                          <Typography>{player.name}</Typography>
                          </>
                        ))}
                  </Card>
                </Grid2>
              )}
              {stats.most_games_played_players[0] && (
              <Grid2 item size={{xs:6, lg: 3}}>
                <Card sx={{padding: 1}} variant="outlined">
                  <Typography variant='h6' sx={{fontWeight:600}}>Hardest workers! ({stats.most_games_played_players[0].games_played} games)</Typography>
                  {stats.most_games_played_players.map( (player,index) => (
                        <>
                        <Typography>{player.name}</Typography>
                        </>
                      ))}
                </Card>
              </Grid2>)}
              {stats.most_wins_players[0] && (
              <Grid2 item size={{xs:6, lg: 3}}>
                <Card sx={{padding: 1}} variant="outlined">
                  <Typography variant='h6' sx={{fontWeight:600}}>Most wins! ({stats.most_wins_players[0].wins} wins)</Typography>
                  {stats.most_wins_players.map( (player,index) => (
                        <>
                          <Typography>{player.name}</Typography>
                        </>
                      ))}
                  
                </Card>
              </Grid2>)}
            </Grid2>)
            :
            (<Typography>Loading</Typography>)
            }
        </Card>
        <Card sx={{p:1}}>
          <Typography variant={"h4"} sx={{textAlign: "center", mb: 1}}> All Games</Typography>
            {Game_table(
              game_columns,
              completeGames, 
              page2,
              rowsPerPage2,
              handleChangePage2,
              handleChangeRowsPerPage,
            )}
        </Card>
        </>
      )}
    </Paper>
  );
}
else {
  <Typography>Loading...</Typography>
}
}


export default EventPage;
