import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button, Typography } from '@mui/material';
import { handleLogout } from '../functions/auth_functions';

function Logout(props) {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (handleLogout({setIsAuthenticated:props.setIsAuthenticated, setError: setError})){
      navigate('/account/login');
    }
  };

  return (
    <div>
      <Typography variant="h6" gutterBottom>
        Are you sure you want to log out?
      </Typography>
      <Button variant="contained" color="error" onClick={handleSubmit}>
        Logout
      </Button>
    </div>
  );
}

export default Logout;