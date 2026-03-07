import { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Paper, Typography } from '@mui/material';


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
            if (error instanceof AxiosError && error.response) {
                errorMessage = error.response.data.detail || errorMessage;
            } else if (error instanceof AxiosError && error.request) {
                errorMessage = 'No response from server'
            } else if (error instanceof Error) {
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
