import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Grid,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Alert,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import { fetchClub } from '../functions/fetch_functions';

function MemberDetail() {
  const [members, setMembers] = useState([]);
  const [open, setOpen] = useState(false); // State for dialog
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [error, setError] = useState(null);
  const { clubId } = useParams();
  const [gender, setGender] = useState('');
  const [club, setClub] = useState(null);

  const fetchMembers = async (clubId) => {
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/club/members/${clubId}/`,
        {
          headers: {
            Authorization: 'Bearer ' + localStorage.getItem('access_token'),
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        }
      );
      console.log('Response Data:', response.data);
      setMembers(response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  useEffect(() => {
    if (clubId) {
      fetchMembers(clubId);
      fetchClub(clubId, setClub);
    }
  }, [clubId]);

  const handleDelete = async (memberId) => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
      };

      await axios.delete(
        `http://127.0.0.1:8000/club/member/${memberId}/${clubId}/`,
        { headers }
      );
      fetchMembers(clubId);
      
    } catch (error) {
      console.error('Error deleting member:', error);
    }
  };
  const handleAdmin = async (club_id, member_id) => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
      };

      const response = await axios.get(
        `http://127.0.0.1:8000/club/make-admin/${member_id}/${club_id}/`, 
        { headers }
      );
      fetchMembers(clubId);
  
    } catch (error) {
      console.error('Error making user an admin:', error);
    }
  };

  const handleCreateMember = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
      };

      const response = await axios.post(
        `http://127.0.0.1:8000/club/dummy-user/create/${clubId}/`, 
        {
          first_name: firstName,
          surname,
          biological_gender: gender // Include gender in the request
        }, 
        { headers }
      );
      console.log(response.data);
      fetchMembers(clubId);
      handleClose(); // Close the dialog
    } catch (error) {
      setError(error.response.data.detail || 'Error creating dummy user.');
      console.error('Error creating dummy user:', error);
    }
  };

  const handleChangeGender = (event) => {
    setGender(event.target.value);
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFirstName('');
    setSurname('');
    setError(null); // Clear error after dialog is closed
  };

  const handleChangeFirstName = (event) => {
    setFirstName(event.target.value);
  };

  const handleChangeSurname = (event) => {
    setSurname(event.target.value);
  };

  if (members.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <Grid container justifyContent="flex-start" alignItems="flex-start" height="100vh">
      <Grid item xs={12} md={8}>
        <Box sx={{ padding: 4 }}>
          <Typography variant="h4" gutterBottom>
            All Members
          </Typography>
          {/* Create Member Button */}
          <Button variant="contained" onClick={handleClickOpen}>
            Create Member
          </Button>
          {/* Create Member Dialog */}
          <Dialog open={open} onClose={handleClose}>
            <DialogTitle>Create New Member</DialogTitle>
            <DialogContent>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                autoFocus
                margin="dense"
                id="first_name"
                label="First Name"
                fullWidth
                value={firstName}
                onChange={handleChangeFirstName}
              />
              <TextField
                margin="dense"
                id="surname"
                label="Surname"
                fullWidth
                value={surname}
                onChange={handleChangeSurname}
              />

            <FormControl component="fieldset" margin="dense" fullWidth>
            <FormLabel component="legend">Biological Gender</FormLabel>
            <RadioGroup
              aria-label="gender"
              name="gender"
              value={gender}
              onChange={handleChangeGender}
            >
              <FormControlLabel 
                value="male" 
                control={<Radio />} 
                label="Male" 
              />
              <FormControlLabel 
                value="female" 
                control={<Radio />} 
                label="Female" 
              />
            </RadioGroup>
        </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Cancel</Button>
              <Button onClick={handleCreateMember}>Create</Button>
            </DialogActions>
          </Dialog>
          <List sx={{ mt: 2 }}>
            {members.map((member) => (
              <ListItem key={member.id}>
                <ListItemButton>
                  <ListItemText
                    primary={
                      member.first_name + ' ' + member.surname
                    }
                  />
                </ListItemButton>
                {club.is_club_president && (
                  <>
                  { !member.is_club_admin && (
                  <Button
                  variant="contained"
                  color="error"
                  onClick={() => handleAdmin(clubId, member.id)}
                  >
                    Make Admin
                  </Button>
                  )}
                  </>
                  
                )}
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => handleDelete(member.id)}
                >
                  Delete
                </Button>
              </ListItem>
            ))}
          </List>
        </Box>
      </Grid>
    </Grid>
  );
}

export default MemberDetail;