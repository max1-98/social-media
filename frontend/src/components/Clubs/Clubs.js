import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Grid2,
  Box,
  Button,
  Paper,
  Card,
} from '@mui/material';

function ClubDetail() {
  const [clubs, setClubs] = useState([]);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/clubs/`, {
          headers: {
            Authorization: 'Bearer ' + localStorage.getItem('access_token'),
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        });
        setClubs(response.data);
      } catch (error) {
        console.error('Error fetching clubs:', error);
      }
    };

    fetchClubs();
  }, []);

  if (clubs.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <Paper>
      <Grid2 container justifyContent="flex-start" alignItems="flex-start" height="100vh">
        
        <Grid2 item xs={12} md={12} sx={{ width: '100%' }}>
          <Box sx={{ padding: 4 }}>
            <Typography variant="h4" gutterBottom align="center">
              All Clubs
            </Typography>
            <Card sx={{p:1}}>
              <List sx={{ mt: 2, width: '100%' }}> 

                {clubs.map((club, index) => (
                  <ListItem key={index}>
                    <ListItemButton
                      component={Link}
                      to={`/club/${club.id}`}
                    >
                      <ListItemText primary={club.name} />
                      <Typography variant="body2" color="textSecondary">
                        Sport: {club.sport}
                      </Typography>
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
              <Box mt={2} sx={{ml: "20px"}} textAlign="left">
                <Button component={Link} to="/club/create" variant="contained" color={"secondary"}>
                  Create Club
                </Button>
              </Box>
            </Card>
            
          </Box>
        </Grid2>
      </Grid2>
    </Paper>
  );
}

export default ClubDetail;
