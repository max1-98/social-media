import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Typography,
  Grid,
  Box,
  Button,
  Link,
  Stack,
} from '@mui/material';

function ClubPage() {
  const [club, setClub] = useState(null);
  const { clubId } = useParams();
  const navigate = useNavigate();

  const fetchClub = async (clubId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(
        `http://127.0.0.1:8000/club/${clubId}/`,
        {
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        }
      );
      setClub(response.data);
    } catch (error) {
      console.error('Error fetching club:', error);
    }
  };

  useEffect(() => {
    if (clubId) {
      fetchClub(clubId);
    }
  }, [clubId]);
  const handleLeave = async (club_id) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.delete(
        `http://127.0.0.1:8000/club/member/${club_id}/`,
        {
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        }
      );
      fetchClub(club_id);
    } catch (error) {
      console.error('Error leaving:', error);
    }

  };
  const createMemberRequest = async (clubId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        'http://127.0.0.1:8000/club/request/create/',
        { club: clubId },
        {
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        }
      );

      console.log('Member request sent successfully');
      fetchClub(clubId);
    } catch (error) {
      console.error('Error creating member request:', error);
    }
  };

  const cancelMemberRequest = async (clubId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        'http://127.0.0.1:8000/club/request/cancel/',
        { club: clubId },
        {
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        }
      );
      fetchClub(clubId);
    } catch (error) {
      console.error('Error deleting member request:', error);
    }
  };

  const handleDelete = async (event) => {
    event.preventDefault();

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.delete(
        `http://127.0.0.1:8000/club/${clubId}/`,
        {
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        }
      );

      console.log('Club deleted');
      navigate('/');
    } catch (error) {
      console.error('Error deleting club: ', error);
    }
  };

  if (!club) {
    return <div>Loading...</div>;
  }

  return (
    <Grid container justifyContent="flex-start" alignItems="flex-start" height="100vh">
      <Grid item xs={12} md={8}>
        <Box sx={{ padding: 4 }}>
          <Typography variant="h4" gutterBottom>
            {club.name}
          </Typography>
          <Stack spacing={2}>
            <Typography variant="body1">
              Sport: {club.sport}
            </Typography>
            <Typography variant="body1">
              President:{' '}
              {club.president ? club.president : 'No president'}
            </Typography>
            <Typography variant="body1">Info: {club.info}</Typography>
            <Typography variant="body1">
              Website:{' '}
              <Link
                href={club.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                {club.website}
              </Link>
            </Typography>
            <Typography variant="body1">
              Signup Link:{' '}
              <Link
                href={club.signup_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {club.signup_link}
              </Link>
            </Typography>
            <Typography variant="body1">
              Created:{' '}
              {new Date(club.date_created).toLocaleDateString()}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2} mt={2}>
            {/* Admin Actions */}
            {club.is_club_admin && (
              <>
                <Button
                  variant="contained"
                  onClick={() => navigate('/club/edit/' + clubId)}
                >
                  Edit Club
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate(`/club/requests/${clubId}`)}
                >
                  Member Requests
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate(`/club/members/${clubId}`)}
                >
                  Members
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate(`/club/attendance/${clubId}`)}
                >
                  Attendance
                </Button>
              </>
            )}

            {/* President Actions (if not already an admin) */}
            {club.is_club_president && (
              <Button variant="contained" color="error" onClick={handleDelete}>
                Delete Club
              </Button>
            )}

            {/* Non-Admin Actions */}
            <>
              {club.membership_status === 0 && (
                <Button
                  variant="contained"
                  onClick={() => createMemberRequest(clubId)}
                >
                  Request to Join
                </Button>
              )}
              {club.membership_status === 1 && (
                <Button
                  variant="contained"
                  onClick={() => cancelMemberRequest(clubId)}
                >
                  Cancel Request
                </Button>
              )}
              {club.membership_status === 2 && (
                <>
                  <Button 
                  variant="contained"
                  onClick={()=> handleLeave(clubId)}
                  >
                    Leave
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => navigate(`/club/events/${clubId}`)}
                  >
                    Events
                  </Button>
                </>
              )}
            </>
          </Stack>
        </Box>
      </Grid>
    </Grid>
  );
}

export default ClubPage;