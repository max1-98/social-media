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
} from '@mui/material';

function EventsDetail() { // Remove the props argument
  const { clubId } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rows, setRows] = useState([]);

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
        sbmm: event.sbmm ? 'Yes' : 'No', 
        guests_allowed: event.guests_allowed ? 'Yes' : 'No', 
        over_18_under_18_mixed: event.over_18_under_18_mixed,
        id: event.id, 
      })));
      
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  useEffect(() => {
    fetchEvents(clubId); // Fetch clubs on component mount
  }, [clubId]); // Empty dependency array to only fetch once

  return (
    <>
      <div>
        <button onClick={() => navigate(`/club/events/create/${clubId}`)}>Create event</button>
      </div>
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow>
              {eventcolumns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    style={{ minWidth: column.minWidth }}
                  >
                    {column.label}
                  </TableCell>
                ))}
                <TableCell key="link" align="center">Links</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
            {rows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => (
                  <TableRow hover role="checkbox" tabIndex={-1} key={row.sport}>
                    {eventcolumns.map((column) => (
                      <TableCell key={column.id} align={column.align}>
                        {row[column.id]}
                      </TableCell>
                    ))}
                    <TableCell key="link" align="center"> <Link to={`/club/event/${clubId}/${row.id}`}>View</Link></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 100]}
          component="div"
          count={rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

    </>
  );
}

export default EventsDetail;