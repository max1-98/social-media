import React, { useState } from 'react';
import axios from 'axios';
import { TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Alert, AlertTitle, Card, Box } from '@mui/material';
import { useParams } from 'react-router-dom';

function MemberAttendanceComponent() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const { clubId } = useParams();
  const [TryFetch, setTryFetch] = useState(false);

  const handleChange = (event, field) => {
    if (field === 'startDate') {
      setStartDate(event.target.value);
      setTryFetch(false);
    } else if (field === 'endDate') {
      setEndDate(event.target.value);
      setTryFetch(false);
    }
  };

  const fetchAttendanceData = async () => {
    setTryFetch(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
      };
      const response = await axios.post(
        `http://127.0.0.1:8000/member-attendance/`, 
        {
          start_date: startDate,
          finish_date: endDate,
          club_id: clubId
        }, 
        { headers }
      );
      setAttendanceData(response.data);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  };

  return (
    <Paper sx={{height: TryFetch ? "100%" : "100vh", p:2}}>
      <Card sx={{p:2}}>
        <Typography variant="h4">Member Attendance</Typography>
        
        <Alert severity="info" sx={{width: 500, my: 2}}>
          <AlertTitle>How to</AlertTitle>
          Enter two dates and receive back how many times each member has attended an event between those two dates.
        </Alert>
        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(event) => handleChange(event, 'startDate')}
          InputLabelProps={{
            shrink: true,
          }}
        />
        <TextField 
          label="End Date" 
          type="date"
          value={endDate}
          onChange={(event) => handleChange(event, 'endDate')}
          InputLabelProps={{
            shrink: true,
          }}
        />
        <br/>
        <Button variant="outlined" sx={{mt: 2}}onClick={fetchAttendanceData} color="secondary">
          Fetch Data
        </Button>

        { (attendanceData.length > 0) ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>First Name</TableCell>
                  <TableCell>Last Name</TableCell>
                  <TableCell>Attendance Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendanceData.map(member => (
                  <TableRow key={member.first_name}>
                    <TableCell>{member.first_name}</TableCell>
                    <TableCell>{member.last_name}</TableCell>
                    <TableCell>{member.attendance_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          TryFetch && <Alert sx={{my: 2, width: 300}} severity="error">No games between these dates.</Alert>
        )}
      </Card>
    </Paper>
  );
}

export default MemberAttendanceComponent;