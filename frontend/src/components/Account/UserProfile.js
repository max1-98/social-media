import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Typography,
  Grid2,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  CircularProgress, // Import CircularProgress
} from '@mui/material';

function UserProfile() {
  const [userData, setUserData] = useState(null);
  const [elos, setElos] = useState([]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const response = await axios.get(
          'http://127.0.0.1:8000/account/profile/',
          {
            headers: {
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json',
              accept: 'application/json',
            },
          }
        );
        setUserData(response.data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Handle errors (e.g., token expired, unauthorized)
    }
  };

  const fetchElos = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const response = await axios.get(
          `http://127.0.0.1:8000/elo/elos/${userData.username}/`,
          {
            headers: {
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json',
              accept: 'application/json',
            },
          }
        );
        setElos(response.data);
        console.log(elos)
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Handle errors (e.g., token expired, unauthorized)
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []); // Fetch data only once on mount

  useEffect(() => {
    if (userData) {
      fetchElos();
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
      <Grid2 container justifyContent="flex-start" alignItems="flex-start" height="100vh">
        <Grid2 item xs={12} md={6}>
          <Box sx={{ padding: 4 }}>
            <Typography variant="h4" gutterBottom align="center">
              User Profile
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1">
                      Name: {userData.first_name} {userData.surname}
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1">
                      Email: {userData.email}
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1">
                      Date of Birth: {userData.date_of_birth}
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1">
                      Followers: {userData.follower_count}
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1">
                      Following: {userData.following_count}
                    </Typography>
                  }
                />
              </ListItem>
            </List>
          </Box>
        </Grid2>
        <Grid2 item xs={12} md={6}> 
          <Box sx={{ padding: 4 }}>
            <Typography variant="h4" gutterBottom align="center">
              Elo List
            </Typography>
            <Grid2 container spacing={2} justifyContent="center"> {/* Use Grid2 container for spacing */}
              {elos.map((elo, index) => (
                <Grid2 key={index} item xs={12} sm={6} md={4}> 
                  <Box 
                    sx={{ 
                      padding: 4, 
                      border: '1px solid lightgray', // Add border for box look 
                      borderRadius: '8px', // Rounded corners
                      backgroundColor: 'lightblue' // Background color
                    }} 
                  >
                    <Typography align="center">Elo: {elo.elo}</Typography>
                    <Typography align="center">{elo.game_type}</Typography> 
                  </Box>
                </Grid2>
              ))}
            </Grid2>
          </Box>
        </Grid2> 
      </Grid2>
    </>
  );
}

export default UserProfile;