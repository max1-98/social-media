import React from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button, Typography } from '@mui/material';

function Logout(props) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
        accept: 'application/json',
      };
      await axios.post(
        'http://127.0.0.1:8000/auth/revoke-token/',
        {
          client_id: 'ai21cVtLBNXSaGQ3QwklqOfxmdH3DOEB21iP2VwO',
          client_secret:
            'cn5upUUXY7gGPEkIccB1AZEIhCUR4h0V9MGY9jD7630HVqyY2kyN7NjoVjkx0EMxDwUVqKNugTdeUa5nD8fsXbewAopFjG9BCFNt5KSyYSYj1wf9CVrAlFxQsQq9GF5S',
          token,
        },
        { headers }
      );

      localStorage.removeItem('access_token');
      
      navigate('/account/login');
      props.setIsAuthenticated(false);
      console.log('Logout successful!');
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('access_token');
      navigate('/account/login');
    }
  };

  return (
    <div>
      <Typography variant="h6" gutterBottom>
        Are you sure you want to log out?
      </Typography>
      <Button variant="contained" color="error" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  );
}

export default Logout;