import React, { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Typography,
  Stack,
  Alert,
  Paper,
  Card,
  Grid2,
} from '@mui/material';

function CreateClub() {
  const [name, setName] = useState('');
  const [clubUsername, setCUsername] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('club_username', clubUsername);
      formData.append('info', info);

      const response = await axios.post(
        'http://127.0.0.1:8000/createclub/',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      navigate('/club/' + response.data.id);
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        setError(error.response.data.detail || 'Error creating club.');
      } else {
        setError('Error creating club.');
      }
    }
  };

  return (
    <Paper sx={{p:4, height: "100vh"}}>
      <Grid2 container sx={{justifyContent:"center", alignItems:"center"}}>
        <Grid2 size={12}>
          <Card
            sx={{
              padding: 4,
              borderRadius: 2,
            }}
          >
            <Typography variant="h4" gutterBottom align="center">
              Create a New Club
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Name"
                  fullWidth
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  color={"common" as any}
                  required
                />
                <TextField
                  label="Club Username"
                  fullWidth
                  value={clubUsername}
                  onChange={(e) => setCUsername(e.target.value)}
                  color={"common" as any}
                  required
                />
                <TextField
                  label="Club Description"
                  fullWidth
                  multiline
                  rows={4}
                  value={info}
                  color={"common" as any}
                  onChange={(e) => setInfo(e.target.value)}
                />

                <Button type="submit" variant="contained" color="secondary" fullWidth>
                  Create Club
                </Button>
              </Stack>
            </form>
          </Card>
        </Grid2>
      </Grid2>
    </Paper>
  );
}

export default CreateClub;
