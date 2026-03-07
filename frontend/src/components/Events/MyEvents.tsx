import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Grid2,
  Divider,
} from '@mui/material';
import EventComponent from './EventComponent/EventComponent';
import type { Event } from '../../types';

interface UpcomingEventsProps {
  upcomingEvents?: Event[];
  setUpcomingEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  activeEvents: Event[];
  setActiveEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  completedEvents: Event[];
  setCompletedEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  [key: string]: any;
}

function UpcomingEvents(props: UpcomingEventsProps) {


  const fetchMyEvents = async () => {
    try {
      const response = await axios.get<Event[]>(`http://127.0.0.1:8000/club/events/`);

      props.setUpcomingEvents(response.data.filter(event => !event.event_active)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      props.setActiveEvents(response.data.filter(event => event.event_active && !event.event_complete)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      props.setCompletedEvents(response.data.filter(event => event.event_active && event.event_complete)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));


    } catch (error) {
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
                    key={event.id}
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
                    key={event.id}
                    event = {event}
                  />
              )}
            </Grid2>
          </>
        )
        :
        (
          <Grid2>
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
                <EventComponent
                  key={event.id}
                  event = {event}
                />
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
