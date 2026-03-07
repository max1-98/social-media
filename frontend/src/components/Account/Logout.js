import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Typography } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

function Logout() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { logout } = useAuth();

  const handleSubmit = async () => {
    if (await logout({setError})){
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
