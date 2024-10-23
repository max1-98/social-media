import React, { useState } from 'react';
import axios from 'axios';
import { TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useParams } from 'react-router-dom';

function MemberAttendanceComponent() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const { clubId } = useParams();

  const handleChange = (event, field) => {
    if (field === 'startDate') {
      setStartDate(event.target.value);
    } else if (field === 'endDate') {
      setEndDate(event.target.value);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'multipart/form-data',
            accept: 'application/json',
      };
      const response = await axios.post(
        `http://127.0.0.1:8000/clubs/member-attendance/`, 
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
    <div>
      <h2>Member Attendance</h2>
      <TextField 
        label="Start Date" 
        type="date"
        value={startDate} 
        onChange={(event) => handleChange(event, 'startDate')}
      />
      <TextField 
        label="End Date" 
        type="date"
        value={endDate}
        onChange={(event) => handleChange(event, 'endDate')}
      />
      <Button variant="contained" onClick={fetchAttendanceData}>
        Fetch Data
      </Button>

      {attendanceData.length > 0 ? (
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
        <p>No games between these dates.</p>
      )}
    </div>
  );
}

export default MemberAttendanceComponent;