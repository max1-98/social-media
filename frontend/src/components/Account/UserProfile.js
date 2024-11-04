import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Typography,
  Grid2,
  Box,
  List,
  ListItem,
  ListItemText,
  Card,
  CircularProgress,
  Paper, // Import CircularProgress
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import UpcomingEvents from '../Events/MyEvents';

function UserProfile() {
  const [userData, setUserData] = useState(null);
  const [elos, setElos] = useState([]);
  const navigate = useNavigate();
  
  // For events tables
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rows1, setRows1] = useState([]);
  const [rows2, setRows2] = useState([]);

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
      <Paper sx={{p:1}}>
        <Grid2 container justifyContent="flex-start" alignItems="flex-start" sx={{display: "flex"}}spacing={1}>

          {/* User info */}
          <Grid2 item size={6}>
            <Card sx={{p:1}}>
              <Typography variant="h4" gutterBottom align="left">
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
            </Card>
          </Grid2>
          {/* Elo list */}
          <Grid2 item size={6}> 
            <Card sx={{p:1, height:"100%"}} >
              <Typography variant="h4" gutterBottom align="center">
                Elo List
              </Typography>
              <Grid2 container spacing={1} justifyContent="center"> 
                {elos.map((elo, index) => (
                  <Grid2 key={index} item size={4}> 
                    <Card variant="outlined" mt={1} onClick={() => navigate(`/account/club/${elo.game_type}`)}>
                      
                      <Typography variant={"h6"} align="center" sx={{fontWeight: 500}}>{elo.game_type}</Typography> 
                      <Typography sx={{fontWeight: 200}} align="left" m={1}>Elo: {elo.elo}</Typography>
                      <Typography sx={{fontWeight: 200}} align="left" m={1}>Games: {elo.total_games} </Typography>
                      <Typography sx={{fontWeight: 200}} align="left" m={1}>W/L ratio: {elo.winrate} </Typography>
                      <Typography sx={{fontWeight: 200}} align="left" m={1}>Best winstreak: {elo.best_winstreak} </Typography>
                      <Typography sx={{fontWeight: 200}} align="left" m={1}>Current winstreak: {elo.winstreak} </Typography>
                      <Typography sx={{fontWeight: 200}} align="left" m={1}>Last game: {elo.last_game} </Typography>
                    </Card>
                  </Grid2>
                ))}
              </Grid2>
            </Card>
          </Grid2> 
        </Grid2>

        <UpcomingEvents
          page={page} 
          setPage={setPage}
          rowsPerPage={rowsPerPage} 
          setRowsPerPage={setRowsPerPage}
          rows1={rows1} 
          setRows1={setRows1}
          rows2={rows2} 
          setRows2={setRows2}
        />
      </Paper>
    </>
  );
}

export default UserProfile;