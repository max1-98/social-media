import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Typography,
  Grid2,
  Select,
  MenuItem,
  Stack,
  Alert,
  Paper,
  Card,
} from '@mui/material';
import { fetchSports } from '../functions/fetch_functions';

function SportForm() {

    const navigate = useNavigate();
    const { clubId } = useParams();
    const [sports, setSports] = useState([]);
    const [sport_name, setSportName] = useState(null);
    const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
        

        const token = localStorage.getItem('access_token');
        const headers = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'multipart/form-data',
            accept: 'application/json',
        };
        const response = await axios.post(
            'http://127.0.0.1:8000/club/add-sport/',
            { sport_name: sport_name, club_id: clubId },
            { headers }
        );

        navigate(`/club/${clubId}`);
    } catch (error) {
        setError(error.response.data.detail || 'Error creating club.');
        console.error('Error creating club:', error);
    }
  };

  useEffect(() => {
    fetchSports({setSports: setSports, setError: setError});
    }, []);


  return (
    <Paper sx={{p:3}}>
      <Grid2 container sx={{height:"100vh"}}>
        <Grid2 item size={12}>
          <Typography variant="h4" gutterBottom align="center">
            Select sport
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                  <Select
                  label="Sport"
                  value={sport_name}
                  onChange={(e) => setSportName(e.target.value)}
                  fullWidth
                  required
                  >
                  {sports.map((sport) => (
                      <MenuItem key={sport.name} value={sport.name}>
                      {sport.name}
                      </MenuItem>
                  ))}
                  </Select>
                  <Button type="submit" variant="contained" color="secondary" fullWidth>
                      Add sport
                  </Button>
              </Stack>
              </form>
        </Grid2>
      </Grid2>
    </Paper>
  );
}

export default SportForm;