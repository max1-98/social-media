import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Grid,
  Box,
  CircularProgress,
} from '@mui/material';

function MyClubsList() {
  const [clubs, setClubs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('access_token');
        const headers = {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          accept: 'application/json',
        };
        const response = await axios.get('http://127.0.0.1:8000/club/my-clubs/', { headers });
        setClubs(response.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Typography variant="body1" color="error">{error}</Typography>;
  }

  return (
    <Grid container justifyContent="flex-start" alignItems="flex-start" sx={{ height: '100vh' }}> 
      <Grid item xs={12} md={8} sx={{ mt: 4 }}> {/* Add margin top */}
        <Typography variant="h5" gutterBottom>
          My Clubs
        </Typography>
        <List>
          {clubs.map((club) => (
            <ListItem key={club.id}>
              <ListItemButton component="a" href={`/club/${club.id}`}>
                <ListItemText primary={club.name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Grid>
    </Grid>
  );
}

export default MyClubsList;