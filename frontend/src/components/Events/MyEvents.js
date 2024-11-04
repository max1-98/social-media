import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate} from 'react-router-dom'; 
import {
  Card,
  Typography,
  Grid2,
} from '@mui/material';
import EventComponent from './EventComponent/EventComponent';

function UpcomingEvents(props) {

  const {page, setPage, rowsPerPage, setRowsPerPage, rows1, setRows1, rows2, setRows2} = props
  const navigate = useNavigate();

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const fetchActiveEvents = async () => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/club/events/active/`, {
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('access_token'),
          'Content-Type': 'application/json',
          accept: 'application/json',
      }
      }); 

      
      setRows2(response.data.map((event) => ({
        sport: event.sport,
        date: new Date(event.date).toLocaleDateString(), 
        start_time: event.start_time,
        finish_time: event.finish_time,
        number_of_courts: event.number_of_courts,
        sbmm: event.sbmm ? 'Yes' : 'No', 
        guests_allowed: event.guests_allowed ? 'Yes' : 'No', 
        over_18_under_18_mixed: event.over_18_under_18_mixed,
        id: event.id,
        club_id: event.club_id, 
        club_name: event.club_name,
      })));
      
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/club/events/upcoming/`, {
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('access_token'),
          'Content-Type': 'application/json',
          accept: 'application/json',
      }
      }); 

      
      setRows1(response.data.map((event) => ({
        sport: event.sport,
        date: new Date(event.date).toLocaleDateString(), 
        start_time: event.start_time,
        finish_time: event.finish_time,
        number_of_courts: event.number_of_courts,
        sbmm: event.sbmm ? 'Yes' : 'No', 
        guests_allowed: event.guests_allowed ? 'Yes' : 'No', 
        over_18_under_18_mixed: event.over_18_under_18_mixed,
        id: event.id, 
        club_id: event.club_id,
        club_name: event.club_name,
      })));
      
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  useEffect(() => {
    fetchUpcomingEvents();
    fetchActiveEvents();
  }, []); 

  return (
    <>
      <Card sx={{ mt: 1, pt: 1, width: '100%', overflow: 'hidden' }}>
        <Typography variant="h6" sx={{textAlign:"center", fontWeight: 600}}>Active Events!</Typography>
          <Grid2 container spacing={1} p={1}>
            {rows2.map( (row) =>
                  <EventComponent
                    event = {row}
                  />
                )}
          </Grid2>
        <Typography variant="h6" sx={{textAlign:"center", fontWeight: 600}}>Upcoming Events!</Typography>
          <Grid2 container spacing={1}>
            {rows1.map( (row) =>
                  <EventComponent
                    event = {row}
                  />
                )}
          </Grid2>
      </Card>

    </>
  );
}

export default UpcomingEvents;