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
import type { MyClub } from '../../types';

function MyClubsList() {
  const [clubs, setClubs] = useState<MyClub[]>([]);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    fetchMyClubs({setClubs: setClubs, setError: setError});
  }, []);


  if (error) {
    return <Typography variant="body1" color="error">{String(error)}</Typography>;
  }

  return (
    <Paper sx={{p:2}}>
      <Grid2 container justifyContent="flex-start" alignItems="flex-start">
        <Grid2 size={12}>
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
