import React from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Logout(props) {
  const navigate = useNavigate(); 
  const handleLogout = async () => {
    try {

      // Make a POST request to your Django API logout endpoint
      const headers =  {
        Authorization: 'Bearer ' + localStorage.getItem('access_token'),
        'Content-Type': 'multipart/form-data',
        accept: 'application/json',
      }
      const response = await axios.post('http://127.0.0.1:8000/auth/revoke-token/', {
        client_id: 'ai21cVtLBNXSaGQ3QwklqOfxmdH3DOEB21iP2VwO',
        client_secret: 'cn5upUUXY7gGPEkIccB1AZEIhCUR4h0V9MGY9jD7630HVqyY2kyN7NjoVjkx0EMxDwUVqKNugTdeUa5nD8fsXbewAopFjG9BCFNt5KSyYSYj1wf9CVrAlFxQsQq9GF5S',
        token: 'oDCd4EMPqZzypMrIvgsKu1CqU2U79z',
        },
        
        {headers}
      );


      // Clear the token from local storage
      localStorage.removeItem('access_token'); 

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