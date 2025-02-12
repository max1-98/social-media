import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Typography, 
  FormControl, 
  FormLabel, 
  RadioGroup, 
  FormControlLabel, 
  Radio, 
  Alert, 
  Paper,
  Grid
} from '@mui/material';

function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [biologicalGender, setBiologicalGender] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const response = await axios.post('http://127.0.0.1:8000/account/register/', {
        username,
        email,
        first_name: firstName, // Use first_name for consistency
        surname,
        date_of_birth: dateOfBirth, // Use date_of_birth for consistency
        biological_gender: biologicalGender, // Use biological_gender for consistency
        password,
      });

      console.log('Registration successful:', response.data);
      navigate('/account/login'); // Redirect to login after successful registration 
    } catch (error) {
      setError(error.response.data.detail || 'Registration failed.');
      console.error('Registration error:', error);
    }
  };

  return (
     <Paper>
      <Grid container spacing={2} justifyContent="center" alignItems="center" sx={{ minHeight: '100vh' }}> {/* Add Grid container */}
        <Grid item xs={12} md={6}> {/* Adjust column sizes as needed */}
          <Typography variant="h4" gutterBottom align="center">Register</Typography>
          {error && <Alert severity="error">{error}</Alert>} 
          <form onSubmit={handleSubmit}>
      
            <TextField
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="normal"
            fullWidth
            />
            <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            fullWidth
            />
            <TextField
            label="First Name"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            margin="normal"
            fullWidth
            />
            <TextField
            label="Surname"
            type="text"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            margin="normal"
            fullWidth
            />
            <TextField
            label="Date of Birth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            margin="normal"
            fullWidth
            />
            <FormControl component="fieldset" margin="normal" fullWidth>
            <FormLabel component="legend">Biological Gender</FormLabel>
            <RadioGroup
                aria-label="gender"
                name="biologicalGender"
                value={biologicalGender}
                onChange={(e) => setBiologicalGender(e.target.value)}
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
            <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            fullWidth
            />
            <TextField
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="normal"
            fullWidth
            />
            <Button type="submit" variant="contained" color="primary" fullWidth>
            Register
            </Button>
            </form>
            <Typography>Already have an account? Login <Link to="/account/login/">here.</Link></Typography>
        </Grid>
      </Grid>
      </Paper>
  );
}

export default Register;