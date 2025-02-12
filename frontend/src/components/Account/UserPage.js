import React, { useState, useEffect } from 'react';
import {
  Typography,
  Grid2,
  Card,
  CircularProgress,
  Paper,
  Stack,
  Box, 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { fetchUserData, fetchUserElos } from '../functions/fetch_functions';


function UserPage() {
  const [userData, setUserData] = useState(null);
  const [elos, setElos] = useState([]);
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetchUserData({setUserData: setUserData, setError: setError})
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
      <Paper sx={{p:1, height:"100vh"}}>
        <Card>
            <Grid2 container sx={{mt:2}}>
                <Grid2 item sx={{ml:2, mr: 2, width:130}} >
                    <Stack spacing={1} sx={{alignItems: "center"}}>
                        <Box sx={{height: 100, width: 100}} component="img" alt="profile picture" src="https://static-00.iconduck.com/assets.00/profile-default-icon-2048x2045-u3j7s5nj.png"/>
                        <Box><Typography sx={{mb:-1}} variant="subtitle2">@{userData.username}</Typography></Box>
                        <Box><Typography variant="subtitle1">{userData.first_name} {userData.surname}</Typography></Box>
                    </Stack>
                </Grid2>

                <Grid2 item size={8}>
                    <Stack>
                        <Box sx={{height: 100, width: "100%"}}>
                            User bio:
                        </Box>
                        <Box>
                            <Grid2 container>
                                <Grid2 item size={6}>
                                    Favourite sport:
                                </Grid2>
                                <Grid2 item size={6}>
                                    Highlighted achievement: 
                                </Grid2>
                            </Grid2>
                        </Box>
                    </Stack>
                </Grid2>
            </Grid2>
        </Card>
        <Grid2 container sx={{m:2}}>
            {/* Here will go a map, building elements into a 3xN container */}
            <Grid2 item sx={{justifyContent: "center"}}size={3}><Typography>Post go here.</Typography></Grid2>
              
        </Grid2>
             
      </Paper>
    </>
  );
}

export default UserPage;