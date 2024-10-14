import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Typography,
  Grid,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Stack,
  Alert,
} from '@mui/material';

function CreateClub() {
  const [name, setName] = useState('');
  const [clubUsername, setCUsername] = useState('');
  const [sport, setSport] = useState('badminton');
  const [info, setInfo] = useState('');
  const [website, setWebsite] = useState('');
  const [signupLink, setSignupLink] = useState('');
  const [logo, setLogo] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('club_username', clubUsername);
      formData.append('sport', sport);
      formData.append('info', info);
      formData.append('website', website);
      formData.append('signup_link', signupLink);

      if (logo) {
        formData.append('logo', logo);
      }

      const token = localStorage.getItem('access_token');
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'multipart/form-data',
        accept: 'application/json',
      };
      const response = await axios.post(
        'http://127.0.0.1:8000/createclub/',
        formData,
        { headers }
      );

      navigate('/club/' + response.data.id);
    } catch (error) {
      setError(error.response.data.detail || 'Error creating club.');
      console.error('Error creating club:', error);
    }
  };

  return (
    <Grid container justifyContent="center" alignItems="center" height="100vh">
      <Grid item xs={12} md={6}>
        <Box
          sx={{
            padding: 4,
            borderRadius: 2,
            boxShadow: 3,
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
                required
              />
              <TextField
                label="Club Username"
                fullWidth
                value={clubUsername}
                onChange={(e) => setCUsername(e.target.value)}
                required
              />
              <FormControl fullWidth>
                <InputLabel id="sport-select-label">Sport</InputLabel>
                <Select
                  labelId="sport-select-label"
                  id="sport"
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                >
                  <MenuItem value="badminton">Badminton</MenuItem>
                  <MenuItem value="tennis">Tennis</MenuItem>
                  <MenuItem value="paddle">Paddle</MenuItem>
                </Select>
                <FormHelperText>Choose a sport for the club.</FormHelperText>
              </FormControl>
              <TextField
                label="Club Description"
                fullWidth
                multiline
                rows={4}
                value={info}
                onChange={(e) => setInfo(e.target.value)}
              />
              <TextField
                label="Club Website"
                fullWidth
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
              <TextField
                label="Club Sign-up Link"
                fullWidth
                type="url"
                value={signupLink}
                onChange={(e) => setSignupLink(e.target.value)}
              />
              <TextField
                type="file"
                id="logo"
                accept="image/*"
                onChange={(e) => setLogo(e.target.files[0])}
                label="Club Logo"
                fullWidth
              />
              <Button type="submit" variant="contained" fullWidth>
                Create Club
              </Button>
            </Stack>
          </form>
        </Box>
      </Grid>
    </Grid>
  );
}

export default CreateClub;