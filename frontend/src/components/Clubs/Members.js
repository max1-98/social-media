import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Grid2,
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
  Paper,
  Radio,
  Card,
  useTheme
} from '@mui/material';
import { fetchClub, fetchClubMembers } from '../functions/fetch_functions';

function MemberDetail() {
  const [members, setMembers] = useState([]);
  const [open, setOpen] = useState(false); // State for dialog
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [error, setError] = useState(null);
  const { clubId } = useParams();
  const [gender, setGender] = useState('');
  const [club, setClub] = useState(null);
  const theme = useTheme();
  

  useEffect(() => {
    if (clubId) {
      fetchClubMembers({club_id: clubId, setError: setError, setMembers: setMembers});
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
      fetchClubMembers({club_id: clubId, setError: setError, setMembers: setMembers});
      
    } catch (error) {
      console.error('Error deleting member:', error);
    }
  };
  const handleAddAdmin = async (club_id, member_id) => {
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
      fetchClubMembers({club_id: clubId, setError: setError, setMembers: setMembers});
  
    } catch (error) {
      console.error('Error making user an admin:', error);
    }
  };

  const handleRemoveAdmin = async (club_id, member_id) => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
      };

      const response = await axios.delete(
        `http://127.0.0.1:8000/club/make-admin/${member_id}/${club_id}/`, 
        { headers }
      );
      fetchClubMembers({club_id: clubId, setError: setError, setMembers: setMembers});
  
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
      fetchClubMembers({club_id: clubId, setError: setError, setMembers: setMembers});
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

  if (members.length === 0 || !club) {
    return <div>Loading...</div>;
  }

  return (
    <Paper>
    <Grid2 container justifyContent="flex-start" alignItems="flex-start">
      <Grid2 item size={12}>
        <Box sx={{ padding: 4,  backgroundColor: theme.palette.userprofile.card, color: theme.palette.userprofile.cardContrastText}}>
          <Typography variant="h4" gutterBottom>
            All Members
          </Typography>
          {/* Create Member Button */}
          <Button sx={{my: 2}} variant="contained" color="secondary" onClick={handleClickOpen}>
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
          <Card>
            <List sx={{ mt: 2 }}>
              {members.map((member) => (
                <ListItem key={member.id}>
                  <ListItemButton color="secondary">
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
                    variant="outlined"
                    color="success"
                    onClick={() => handleAddAdmin(clubId, member.id)}
                    >
                      Make Admin
                    </Button>
                    )}
                    { member.is_club_admin && (
                      <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleRemoveAdmin(clubId, member.id)}
                      >
                        Remove Admin
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
          </Card>
        </Box>
      </Grid2>
    </Grid2>
    </Paper>
  );
}

export default MemberDetail;