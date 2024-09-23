import React from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Logout(props) {
  const navigate = useNavigate(); 

  const handleLogout = async () => {
    try {
      // Make a POST request to your Django API logout endpoint
      const response = await axios.post('http://127.0.0.1:8000/account/logout/', {}, {
        headers: {
          Authorization: `Token ${localStorage.getItem('token')}` // Include the token in the header
        }
      });

      // Clear the token from local storage
      localStorage.removeItem('token'); 

      // Redirect to the login page
      console.log('Logout successful!'); 
      props.setIsAuthenticated(false);
      navigate('/account/login'); // Redirect to the login page

    } catch (error) {
      console.error('Logout error:', error);
      // Handle errors if the logout fails 
    }
  };

  return (
    <button onClick={handleLogout}>Logout</button> 
  );
}

export default Logout;