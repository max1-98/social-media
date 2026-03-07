import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Paper,
  Grid2,
  Button,
  Typography,
  Card,
} from '@mui/material';
import EventComponent from './EventComponent/EventComponent';
import { fetchClub } from '../functions/fetch_functions';
import type { Event, Club } from '../../types';

function EventsDetail() {
  const { clubId } = useParams();
  const [club, setClub] = useState<Club | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [activeEvents, setActiveEvents] = useState<Event[]>([]);
  const [completedEvents, setCompletedEvents] = useState<Event[]>([]);
  const navigate = useNavigate();

  const fetchEvents = async (club_id: string) => {
    try {
      const response = await axios.get<Event[]>(`http://127.0.0.1:8000/club/events/${club_id}/`);


      setUpcomingEvents(response.data.filter(event => !event.event_active)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setActiveEvents(response.data.filter(event => event.event_active && !event.event_complete)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setCompletedEvents(response.data.filter(event => event.event_active && event.event_complete)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

    } catch (error) {
    }
  };

  useEffect(() => {
    if (clubId) {
      fetchEvents(clubId);
      fetchClub(clubId, setClub);
    }
  }, [clubId]);

  return (
      <Paper sx={{p:1}}>
        <Button onClick={()=>navigate(`/club/events/create/${clubId}`)} color="secondary">Create an event</Button>
        {!activeEvents && !upcomingEvents && !completedEvents ? (
          <Typography>Loading...</Typography>
        )

        :(
        <>
          {/* Only display an Active Events part if there are active events */}
          {activeEvents && activeEvents.length > 0 &&
          (
            <Card sx={{ mt: 1, p: 2, width: '100%', overflow: 'hidden' }}>
              <Typography variant="h6" sx={{textAlign:"center", fontWeight: 600}}>Active Events!</Typography>
              <Grid2 container spacing={1}>
                {activeEvents.map( (event) =>
                  <EventComponent
                    key={event.id}
                    event = {event}
                  />
                )}
              </Grid2>
            </Card>
          )
          }

            {/* Display an upcoming events, even if there are no upcoming events.*/}
            <Card sx={{ mt: 1, p: 2, width: '100%', overflow: 'hidden' }}>
            <Typography variant="h6" sx={{textAlign:"center", fontWeight: 600}}>Upcoming Events!</Typography>

              <Grid2 container spacing={1}>
                {upcomingEvents && upcomingEvents.length > 0 ?
                (
                  upcomingEvents.map( (event) =>
                    <EventComponent
                      key={event.id}
                      event = {event}
                    />
                  )
                )
                  :
                  (
                    <Grid2>
                      <Typography variant="h4" sx={{textAlign:"center", fontWeight: 200}}> No upcoming events.</Typography>
                    </Grid2>
                  )}

              </Grid2>
              </Card>

              {/* Display completed events, even if there are no complete events.*/}
              <Card sx={{ mt: 1, p: 2, width: '100%', overflow: 'hidden' }}>
              <Typography variant="h6" sx={{textAlign:"center", fontWeight: 600}}>
                    Complete Events
              </Typography>
              <Grid2 container spacing={1}>
                {completedEvents && completedEvents.length > 0 ?
                (
                  completedEvents.map( (event) =>
                    <EventComponent
                      key={event.id}
                      event = {event}
                    />
                  )
                )
                  :
                  (
                    <Typography variant="h4" sx={{textAlign:"center", fontWeight: 200}}> No complete events.</Typography>
                  )}

              </Grid2>
            </Card>
          </>
        )}
    </Paper>
  );
}

export default EventsDetail;
