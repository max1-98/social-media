import React, { useState, useEffect } from 'react';
import {
  Typography,
  Grid2,
  Card,
  CircularProgress,
  Paper,
  Avatar,
  Dialog,
  Button,
  Stack,
  useTheme,
  Box,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import UpcomingEvents from '../Events/MyEvents';
import { fetchMyClubs, fetchUserData, fetchUserElos } from '../functions/fetch_functions';
import SportIcon from '../Iconizer/SportIcon';


// , backgroundImage: `url(${CardSvg})`
function UserProfile() {
  const [userData, setUserData] = useState(null);
  const [elos, setElos] = useState([]);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [elo, setElo] = useState({});
  const [clubs, setClubs] = useState([]);
  const navigate = useNavigate();
  const theme = useTheme();

  // For events tables
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [activeEvents, setActiveEvents] = useState([]);
  const [completedEvents, setCompletedEvents] = useState([]);

  const handleOpen = (i) => {
    setElo(elos[i]);
    setOpenDialog(true);
  };

  const handleClose = () => {
    setElo({});
    setOpenDialog(false);
  };

  useEffect(() => {
    fetchUserData({setUserData: setUserData, setError: setError});
    fetchMyClubs({setClubs: setClubs, setError: setError});
  }, []);

  useEffect(() => {
    if (userData) {
      fetchUserElos({setElos: setElos, setError: setError, username: userData.username});
    }
  }, [userData]);

  if (!userData) {
    return (
      <Grid2
        container
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
      </Grid2>
    );
  }

  return (
    <>
      <Paper sx={{p:1, height: (upcomingEvents.length>0 || activeEvents.length>0 || completedEvents.length>0) ? "100%" : "100vh" }}>
        <Grid2 container justifyContent="flex-start" alignItems="flex-start" sx={{display: "flex"}} spacing={1}>

          {/* User info */}
          <Grid2 item size={12} sx={{width:"92vw"}}>
            <Card sx={{width: "100%", p:2, backgroundColor: theme.palette.userprofile.paper, color: theme.palette.userprofile.paperContrastText}}>
              <Grid2 container>
                <Grid2 item size={2} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign:"center"}}>
                  <Box>
                    <Avatar sx={{height:75, width: 75}}></Avatar>
                    <Typography variant="subtitle1" sx={{fontWeight:900}}>
                      {userData.first_name} {userData.surname}
                    </Typography>
                  </Box>
                </Grid2>
                <Grid2 item size={10}>
                  <Typography variant="h6" sx={{fontWeight: 800}} >My clubs</Typography>
                  { clubs.length > 0 ? (
                  <Stack direction="row" spacing={1}>
                    {clubs.map((club) => (
                      <Card sx={{p:2, textAlign: "center", justifyItems: "center", width: "300em"}} onClick={()=>navigate(`/club/${club.id}`)}>
                        <Avatar src={club.logo}/>
                        <Typography variant="subtitle2" sx={{fontWeight:300, height: 35}}>{club.name}</Typography>
                        {club.sport_type && (
                        <SportIcon sport={club.sport_type.name} />
                        )}
                      </Card>
                    ))}
                  </Stack>
                  )
                  :
                  (
                    <>
                      <Typography>You are not a member of any clubs.</Typography> <Button variant="outlined" color="secondary.contrastText" onClick={()=>navigate("/")}>Find clubs.</Button> <Button variant="outlined" color="secondary.contrastText" onClick={()=>navigate("/club/create")}>Create a club.</Button>
                    </>
                  )
                }
                </Grid2>
              </Grid2>
            </Card>
          </Grid2>

          {/* Elo list */}
          <Grid2 item size={12} sx={{p:2}}> 
              <Typography variant="h6" sx={{ml:3}} gutterBottom align="left">
                Elo List
              </Typography>
              <Grid2 container spacing={1} justifyContent="left"> 
                { elos.length > 0 ? (
                elos.map((elo, index) => (
                  <Grid2 key={index} item sx={{ml:2}} size={4}> 
                    <Card mt={1} sx={{p:2, textAlign: "center", backgroundColor: theme.palette.userprofile.card, color: theme.palette.userprofile.cardContrastText}} onClick={()=>handleOpen(index)}>
                      <SportIcon sport={elo.sport}/>
                      <Typography variant={"subtitle1"} align="center" sx={{fontWeight: 300}}>{elo.style}</Typography> 
                      <Typography variant={"h4"} sx={{fontWeight: 800}} align="left" m={1}>{elo.elo}</Typography>
                    </Card>
                  </Grid2>
                )))
                :
                (
                  <Grid2 item sx={{ml:2}}> 
                  <Typography>You have no sports stats. Participate in a club event to add sports stats.</Typography>
                  </Grid2>)}
              
              </Grid2>
          </Grid2> 
        </Grid2>
        
        <UpcomingEvents
          upcomingEvent={upcomingEvents}
          setUpcomingEvents={setUpcomingEvents}
          activeEvents={activeEvents}
          setActiveEvents={setActiveEvents}
          completedEvents={completedEvents}
          setCompletedEvents={setCompletedEvents}
        />

        <Dialog
          open={openDialog}
          onClose={handleClose}
        >
          <Grid2 container sx={{p:3}} spacing={3} >
            <Grid2 item size={6} sx={{textAlign:"left"}}>
              <SportIcon sport={elo.sport}/>
              <Typography variant={"subtitle1"} sx={{fontWeight: 300}}>{elo.style}</Typography>
            </Grid2>
            <Grid2 item size={6}>
              <Typography variant={"h4"} sx={{fontWeight: 800}}>Elo: {elo.elo}</Typography>
            </Grid2>
            <Grid2 item size={6} sx={{textAlign:"left"}}>
              <Typography>Total games: {elo.total_games}</Typography>
              <Typography>Current winstreak: {elo.winstreak}</Typography>
              <Typography>Win/loss ratio: {Math.ceil(elo.winrate*100)/100}</Typography>
            </Grid2>
            <Grid2 item size={6} sx={{textAlign:"left"}}>
              <Typography>Wins: {elo.wins}</Typography>
              <Typography>Best winstreak: {elo.best_winstreak}</Typography>
              <Typography>Last played: {elo.last_game}</Typography>
            </Grid2>
            <Button sx={{width:"100%"}} color="secondary" variant="contained" onClick={()=>handleClose()}>Close</Button>
          </Grid2>
          
            
          </Dialog>
          
      </Paper>
    </>
  );
}

export default UserProfile;