import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
  TextField,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormHelperText,
  Grid2,
  Box,
  Paper,
} from '@mui/material';

function CreateEvent() {
  const { clubId } = useParams();
  const [sport, setSport] = useState('badminton singles');
  const [date, setDate] = useState('');
  const [start_time, setST] = useState('');
  const [finish_time, setFT] = useState('');
  const [number_of_courts, setNOC] = useState('1');
  const [sbmm, setSBMM] = useState(true);
  const [guests_allowed, setGA] = useState(false);
  const [over_18_under_18_mixed, setOUM] = useState('all ages');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const data = {
        game_type: sport,
        date: date,
        start_time: start_time,
        finish_time: finish_time,
        number_of_courts: number_of_courts,
        sbmm: sbmm.toString(),
        guests_allowed: guests_allowed.toString(),
        over_18_under_18_mixed: over_18_under_18_mixed,
      };

      console.log(data);
      const token = localStorage.getItem('access_token');
      const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        accept: 'application/json',
      };
      const response = await axios.post(
        `http://127.0.0.1:8000/club/event/create/${clubId}/`,
        data,
        { headers: headers }
      );

      navigate(`/club/event/${clubId}/${response.data.id}`);
    } catch (error) {
      console.error('Error creating club:', error);
    }
  };

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, height: "100vh" }}>
      <Typography variant="h4" gutterBottom align="center">
        Create a New Event
      </Typography>
      <Grid2 container spacing={2}>
        <Grid2 item size={{xs: 12, md: 6}}>
          <FormControl fullWidth color="common">
            <InputLabel htmlFor="sport" color="common">Sport</InputLabel>
            <Select
              id="sport"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
            >
              <MenuItem value="badminton singles">Badminton Singles</MenuItem>
              <MenuItem value="badminton doubles">Badminton Doubles</MenuItem>
              <MenuItem value="tennis singles">Tennis Singles</MenuItem>
              <MenuItem value="tennis doubles">Tennis Doubles</MenuItem>
              <MenuItem value="paddle singles">Paddle Singles</MenuItem>
              <MenuItem value="paddle doubles">Paddle Doubles</MenuItem>
            </Select>
          </FormControl>
        </Grid2>
        <Grid2 item size={{xs: 12, md: 6}}>
          <TextField
            fullWidth
            id="date"
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            color="common"
            required
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Grid2>
        <Grid2 item size={{xs: 12, md: 6}}>
          <TextField
            fullWidth
            id="start_time"
            label="Start Time"
            type="time"
            value={start_time}
            onChange={(e) => setST(e.target.value)}
            color="common"
            required
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Grid2>
        <Grid2 item size={{xs: 12, md: 6}}>
          <TextField
            fullWidth
            id="finish_time"
            label="Finish Time"
            type="time"
            value={finish_time}
            onChange={(e) => setFT(e.target.value)}
            color="common"
            required
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Grid2>
        <Grid2 item size={{xs: 12, md: 6}}>
          <TextField
            fullWidth
            id="number_of_courts"
            label="Number of Courts"
            type="number"
            value={number_of_courts}
            onChange={(e) => setNOC(parseInt(e.target.value, 10))}
            color="common"
            min="1"
            required
          />
        </Grid2>
        <Grid2 item size={{xs: 12, md: 6}}>
          <FormControlLabel
            control={
              <Checkbox
                checked={sbmm}
                onChange={(e) => setSBMM(e.target.checked)}
                id="sbmm"
                color="secondary"
              />
            }
            label="Skill Based Match-making"
          />
        </Grid2>
        <Grid2 item size={{xs: 12, md: 6}}>
          <FormControlLabel
            control={
              <Checkbox
                checked={guests_allowed}
                onChange={(e) => setGA(e.target.checked)}
                id="guests_allowed"
                color="secondary"
              />
            }
            label="Guests Allowed"
          />
        </Grid2>
        <Grid2 item size={{xs: 12, md: 6}}>
          <FormControl fullWidth color="common">
            <InputLabel 
              htmlFor="over_18_under_18_mixed" 
              color="common"
              InputLabelProps={{
                shrink: true,
              }}
              >
              Age Groups Allowed
            </InputLabel>
            <Select
              id="over_18_under_18_mixed"
              value={over_18_under_18_mixed}
              onChange={(e) => setOUM(e.target.value)}
            >
              <MenuItem value="over_18">Over 18</MenuItem>
              <MenuItem value="under_18">Under 18</MenuItem>
              <MenuItem value="all ages">All ages</MenuItem>
            </Select>
          </FormControl>
        </Grid2>
        <Grid2 item size={12}>
          <Button type="submit" variant="contained" fullWidth color={"secondary"}>
            Create Event
          </Button>
        </Grid2>
      </Grid2>
    </Paper>
  );
}

export default CreateEvent;