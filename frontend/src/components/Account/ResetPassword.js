import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, AlertTitle, Button, Paper, TextField, Typography } from '@mui/material';


function PasswordReset() {
    const {token} = useParams();
    const navigate = useNavigate();
    const [password1, setPassword1] = useState("");
    const [password2, setPassword2] =  useState("");
    const [error, setError] = useState('');

    const handleResetPassword = async (e) => {
        e.preventDefault();
        try {
            
            const response = await axios.post('http://localhost:8000/authorization/reset/', {
                password1: password1,
                password2: password2,
                password_token: token,
            });
            navigate("/account/login")

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
                Reset Password
            </Typography>
            <form onSubmit={handleResetPassword}>
                <TextField
                label="Password"
                fullWidth
                margin="normal"
                type="password"
                value={password1}
                onChange={(e) => setPassword1(e.target.value)}
                />
                <TextField
                label="Re-enter password"
                fullWidth
                margin="normal"
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                />
                { !(error==='') && (
                    <Alert severity='error'>
                        <AlertTitle>Login Error</AlertTitle>
                        <Typography>{error}</Typography>
                    </Alert>
                )}
                <Button type="submit" variant="contained" color="secondary" fullWidth sx={{ mt: 2 }}>
                    Change password
                </Button>
            </form>
        </Paper>
    );
}

export default PasswordReset;