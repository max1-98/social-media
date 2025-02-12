import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Grid2,
  Paper,
  Card,
} from '@mui/material';
import { fetchMyClubs } from '../functions/fetch_functions';

function MyClubsList() {
  const [clubs, setClubs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMyClubs({setClubs: setClubs, setError: setError});
  }, []);


  if (error) {
    return <Typography variant="body1" color="error">{error}</Typography>;
  }

  return (
    <Paper sx={{p:2}}>
      <Grid2 container justifyContent="flex-start" alignItems="flex-start"> 
        <Grid2 item size={12}> {/* Add margin top */}
          <Typography variant="h5" gutterBottom textAlign={"center"} sx={{fontWeight: 700, mb:2}}>
            My Clubs
          </Typography>

          <Card sx={{p:2}}>
            <List>
              {clubs.map((club) => (
                <ListItem key={club.id}>
                  <ListItemButton component="a" href={`/club/${club.id}`}>
                    <ListItemText primary={club.name} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Card>
        </Grid2>
      </Grid2>
    </Paper>
  );
}

export default MyClubsList;