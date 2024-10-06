import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom'; // Import useParams
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import { membercolumns } from './consts/columns';
import { Button } from '@mui/material';



function EventPage() {
  const [club, setClub] = useState(null);
  const [event, setEvent] = useState([]);
  const [amembers, setAMembers] = useState([]);
  const [members, setMembers] = useState([]);
  const { clubId } = useParams(); // Get clubId from the URL
  const { eventId } = useParams(); // Get eventId from the URL
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

  const fetchEvent = async (event_id) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`http://127.0.0.1:8000/club/event/${event_id}/`, {
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        accept: 'application/json',
      }
    });
    setEvent(response.data);
    console.log(event)
    setAMembers(response.data.active_members);
    console.log(response.data)
    
    
    } catch (error) {
        console.error('Error fetching event:', error);
    }
  };

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
  } catch (error) {
    console.error('Error fetching club:', error);
  }
  };

  const fetchMembers = async (club_id) => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/club/members/${club_id}/`, {
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('access_token'),
          'Content-Type': 'application/json',
          accept: 'application/json',
      }
      }); 
      setMembers(response.data); // Update the state with all clubs
    } catch (error) {
      console.error('Error fetching clubs:', error);
    }
  };

  const handleActivate = async (memberId) => {
    try {
        const token = localStorage.getItem('access_token');
        const headers = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
        }
        const response = await axios.post(`http://127.0.0.1:8000/club/event/activate-member/`, 
        {
            user: memberId,
            event: eventId,
        },
        {headers}
      );
      fetchEvent(eventId);
      fetchMembers(clubId)
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const handleDeactivate = async (memberId) => {
    try {
        const token = localStorage.getItem('access_token');
        const headers = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
        }
        const response = await axios.post(`http://127.0.0.1:8000/club/event/deactivate-member/`, 
        {
            user: memberId,
            event: eventId,
        },
        {headers}
      );
      fetchEvent(eventId);
      fetchMembers(clubId)
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const handleStart = async(event_id) => {
    
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          accept: 'application/json',
      }
      const response = await axios.post(`http://127.0.0.1:8000/club/event/start/`, 
      {
          event: event_id,
      },
      {headers}
    );
    fetchEvent(event_id);
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const handleComplete = async(event_id) => {
    
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          accept: 'application/json',
      }
      const response = await axios.post(`http://127.0.0.1:8000/club/event/complete/`, 
      {
          event: event_id,
      },
      {headers}
    );
    fetchEvent(event_id);
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchEvent(eventId);
      fetchClub(clubId);
      fetchMembers(clubId);
    }
  }, []);


  return (
    
    <> 
      <div>
        
            {!event.event_active && (
              <>
                <Button onClick={() => handleStart(event.id)}>Start event</Button>
              </>
            )}
            {event.event_active && !event.event_complete && (
              <>
                <Button onClick={() => handleComplete(event.id)}>Complete event</Button>
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                  {/* Table for Active Members */}
                  <h2>Active Members</h2>
                  <TableContainer sx={{ maxHeight: 220 }}>
                    <Table stickyHeader aria-label="sticky table">
                      <TableHead>
                        <TableRow>
                          {membercolumns.map((column) => (
                            <TableCell
                              key={column.id}
                              align={column.align}
                              style={{ minWidth: column.minWidth }}
                            >
                              {column.label}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {amembers
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((member) => (
                            <TableRow hover role="checkbox" tabIndex={-1} key={member.id}> 
                              <>
                                <TableCell key={`name-${member.id}`}>
                                  {member.first_name} {member.surname}
                                </TableCell>
                                <TableCell key={`username-${member.id}`}>
                                  {member.username}
                                </TableCell>
                              </>
                              <TableCell key="link" align="center"> 
                                <button onClick={() => handleDeactivate(member.id)}>Deactivate</button>
                              </TableCell> 
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    rowsPerPageOptions={[10, 25, 100]}
                    component="div"
                    count={amembers.length} // Update count for active members
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                  />

                  {/* Table for Remaining Members */}
                  <h2>Inactive Members</h2>
                  <TableContainer sx={{ maxHeight: 220 }}>
                    <Table stickyHeader aria-label="sticky table">
                      <TableHead>
                        <TableRow>
                          {membercolumns.map((column) => (
                            <TableCell
                              key={column.id}
                              align={column.align}
                              style={{ minWidth: column.minWidth }}
                            >
                              {column.label}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {members.filter(
                          (member) => !amembers.some((amember) => amember.id === member.id)
                        )
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((member) => (
                            <TableRow hover role="checkbox" tabIndex={-1} key={member.id}> 
                              <>
                                <TableCell key={`name-${member.id}`}>
                                  {member.first_name} {member.surname}
                                </TableCell>
                                <TableCell key={`username-${member.id}`}>
                                  {member.username}
                                </TableCell>
                              </>
                              <TableCell key="link" align="center"> 
                                <button onClick={() => handleActivate(member.id)}>Activate</button>
                              </TableCell> 
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    rowsPerPageOptions={[10, 25, 100]}
                    component="div"
                    count={members.filter(
                      (member) => !amembers.some((amember) => amember.id === member.id)
                    ).length} // Update count for remaining members
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                  />
                </Paper>
              </>
              
            )}
      </div>

      
    </>

  );
}

export default EventPage;
