import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom'; // Import Link
import { eventcolumns } from './consts/columns';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Grid2,
  Button,
} from '@mui/material';
import EventComponent from './EventComponent/EventComponent';
import { fetchClub } from '../functions/fetch_functions';

function EventsDetail() { // Remove the props argument
  const { clubId } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rows, setRows] = useState([]);
  const [club, setClub] = useState({});

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const fetchEvents = async (club_id) => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/club/events/${club_id}/`, {
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('access_token'),
          'Content-Type': 'application/json',
          accept: 'application/json',
      }
      }); 

      
      setRows(response.data.map((event) => ({
        sport: event.sport,
        date: new Date(event.date).toLocaleDateString(), 
        start_time: event.start_time,
        finish_time: event.finish_time,
        number_of_courts: event.number_of_courts,
        sbmm: event.sbmm, 
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
    fetchEvents(clubId); 
    fetchClub(clubId, setClub);
  }, [clubId]); 

  return (
    <>
      <Paper>
        <Button onClick={() => navigate(`/club/events/create/${clubId}`)}>Create event</Button>
      </Paper>
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Grid2 container spacing={1}>
          {rows.map( (row) =>
            <EventComponent
              event = {row}
            />
          )}
        </Grid2>
      </Paper>

    </>
  );
}

export default EventsDetail;