import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
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

function EditClub() {
  const [club, setClub] = useState(null);
  const { clubId } = useParams();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm();

  const fetchClub = async (club_id) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`http://127.0.0.1:8000/club/${club_id}/`, {
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        accept: 'application/json',
      }
    });
    setClub(response.data);
    reset(response.data);
  } catch (error) {
    console.error('Error fetching club:', error);
  }
  };

  useEffect(() => {
    if (clubId) {
      fetchClub(clubId);
    }
  }, []);


  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('club_username', data.club_username);
      formData.append('sport', data.sport);
      formData.append('info', data.info);
      formData.append('website', data.website);
      formData.append('signup_link', data.signup_link);

      if (data.logo) {
        formData.append('logo', data.logo);
      }
      const token = localStorage.getItem('access_token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
        accept: 'application/json',
      };
      const response = await axios.put(
        `http://127.0.0.1:8000/club/edit/${clubId}/`,
        formData,
        {headers}
      );

      navigate('/club/' + response.data.id);
    } catch (error) {
      console.error('Error updating club:', error);
    }
  };

  if (!club) {
    return <div>Loading...</div>;
  }

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
            Edit Club
          </Typography>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
              <TextField
                label="Name"
                fullWidth
                {...register('name', { required: true })}
              />
              {errors.name && (
                <FormHelperText error>Name is required</FormHelperText>
              )}

              <TextField
                label="Club Username"
                fullWidth
                {...register('club_username', { required: true })}
              />
              {errors.club_username && (
                <FormHelperText error>
                  Club Username is required
                </FormHelperText>
              )}

              <FormControl fullWidth>
                <InputLabel id="sport-select-label">Sport</InputLabel>
                <Select
                  labelId="sport-select-label"
                  id="sport"
                  {...register('sport', { required: true })}
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
                {...register('info', { required: true })}
              />
              {errors.info && (
                <FormHelperText error>Description is required</FormHelperText>
              )}

              <TextField
                label="Club Website"
                fullWidth
                type="url"
                {...register('website', { required: true })}
              />
              {errors.website && (
                <FormHelperText error>Website is required</FormHelperText>
              )}

              <TextField
                label="Club Sign-up Link"
                fullWidth
                type="url"
                {...register('signup_link', { required: true })}
              />
              {errors.signup_link && (
                <FormHelperText error>
                  Sign-up link is required
                </FormHelperText>
              )}

              <TextField
                type="file"
                id="logo"
                accept="image/*"
                {...register('logo')}
                label="Club Logo"
                fullWidth
              />

              <Button type="submit" variant="contained" fullWidth>
                Update Club
              </Button>
            </Stack>
          </form>
        </Box>
      </Grid>
    </Grid>
  );
}

export default EditClub;
    


