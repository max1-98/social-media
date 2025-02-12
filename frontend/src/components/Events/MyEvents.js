import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate} from 'react-router-dom'; 
import {
  Box,
  Card,
  Typography,
  Grid2,
  Divider,
} from '@mui/material';
import EventComponent from './EventComponent/EventComponent';

function UpcomingEvents(props) {
  

  const fetchMyEvents = async () => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/club/events/`, {
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('access_token'),
          'Content-Type': 'application/json',
          accept: 'application/json',
      }
      }); 

      props.setUpcomingEvents(response.data.filter(event => !event.event_active)
        .sort((a, b) => new Date(a.date) - new Date(b.date))); // Sort upcoming by soonest
      props.setActiveEvents(response.data.filter(event => event.event_active && !event.event_complete)
        .sort((a, b) => new Date(b.date) - new Date(a.date))); // Sort active by most recent
      props.setCompletedEvents(response.data.filter(event => event.event_active && event.event_complete)
        .sort((a, b) => new Date(b.date) - new Date(a.date))); // Sort completed by most recent
      
      
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  
  useEffect(() => {
    fetchMyEvents();
  }, []); 

  return (
    <>
    {props.activeEvents && props.upcomingEvents && props.completedEvents ? (
      <Typography>Loading...</Typography>
    )
  
    :(
    <>
      {/* Only display an Active Events part if there are active events */}
      {props.activeEvents &&
      ( 
        <Box sx={{ mt: 1, p: 2, width: '100%', overflow: 'hidden' }}>
          <Typography variant="h6" sx={{ml: 3, textAlign:"left", fontWeight: 600}}>Active events</Typography>
          <Grid2 container spacing={1}>
            {props.activeEvents.map( (event) =>
              
                  <EventComponent
                    event = {event}
                  />
                
            )}
          </Grid2>
        </Box>
      )
      }
      <Divider/>
      {/* Display an upcoming events, even if there are no upcoming events.*/}
      <Box sx={{ mt: 1, p: 2, width: '100%', overflow: 'hidden' }}>
        {props.upcomingEvents ? 
        ( 
          <>
            <Typography variant="h6" sx={{ml: 3, textAlign:"left", fontWeight: 600}}>Upcoming events</Typography>
            <Grid2 container spacing={1}>
              {props.upcomingEvents.map((event) =>
                
                  <EventComponent
                    event = {event}
                  />
              )}
            </Grid2>
          </>
        ) 
        : 
        ( 
          <Grid2 item>
            <Typography variant="h4" sx={{ml: 2, textAlign:"left", fontWeight: 200}}> No upcoming events.</Typography>
          </Grid2> 
        )}
      </Box>
      <Divider/>
      {/* Display completed events, even if there are no complete events.*/}
      <Box sx={{ mt: 1, p: 2, width: '100%', overflow: 'hidden' }}>
        <Typography variant="h6" sx={{ml: 3, textAlign:"left", fontWeight: 600}}>
              Past events
        </Typography>
        <Grid2 container spacing={1}>
          {props.completedEvents.length> 0 ? 
            (
              props.completedEvents.map( (event) =>
                <>
                  <EventComponent
                    event = {event}
                  />
                </>
              )
            ) 
            : 
            (
              <Typography variant="h4" sx={{ml: 2, textAlign:"left", fontWeight: 200}}> No past events.</Typography> 
            )}
          
          </Grid2>
      </Box>
      </>
    )}
    </>
  );
}

export default UpcomingEvents;