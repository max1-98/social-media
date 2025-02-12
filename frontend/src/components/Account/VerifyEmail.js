import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertTitle, Button, Paper, TextField, Typography } from '@mui/material';


function VerifyEmail() {
    const {token} = useParams();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleVerify = async () => {
        try {
            
            const response = await axios.post('http://localhost:8000/authorization/verify/', {
            
                email_token: token,
            });
            navigate("/")

        } catch(error) {
            let errorMessage = 'An error occurred.';
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                errorMessage = error.response.data.detail || errorMessage; // Access detail if it exists
            } else if (error.request) {
                // The request was made but no response was received
                errorMessage = 'No response from server'
            } else {
                // Something happened in setting up the request that triggered an Error
                errorMessage = error.message;
            }
            setError(errorMessage); 
        }
    };

    
    return (
        <Paper sx={{height:"100vh", p:5}}>
            <Typography variant="h6" gutterBottom>
                Verify email
            </Typography>
            
            <Button variant="contained" color="secondary" fullWidth sx={{ mt: 2 }} onClick={()=> handleVerify()}>
                Confirm
            </Button>
        </Paper>
    );
}

export default VerifyEmail;