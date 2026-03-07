import React, { useEffect, useState } from 'react';
import axios, { AxiosError } from 'axios';
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
} from '@mui/material';
import { fetchSports } from '../functions/fetch_functions';
import type { Sport } from '../../types';

function SportForm() {

    const navigate = useNavigate();
    const { clubId } = useParams();
    const [sports, setSports] = useState<Sport[]>([]);
    const [sport_name, setSportName] = useState<string | null>(null);
    const [error, setError] = useState<string | unknown>('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {

        const response = await axios.post(
            'http://127.0.0.1:8000/club/add-sport/',
            { sport_name: sport_name, club_id: clubId },
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        navigate(`/club/${clubId}`);
    } catch (error) {
        if (error instanceof AxiosError && error.response) {
            setError(error.response.data.detail || 'Error creating club.');
        } else {
            setError('Error creating club.');
        }
    }
  };

  useEffect(() => {
    fetchSports({setSports: setSports, setError: setError});
    }, []);


  return (
    <Paper sx={{p:3}}>
      <Grid2 container sx={{height:"100vh"}}>
        <Grid2 size={12}>
          <Typography variant="h4" gutterBottom align="center">
            Select sport
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {String(error)}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                  <Select
                  label="Sport"
                  value={sport_name}
                  onChange={(e) => setSportName(e.target.value as string)}
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
