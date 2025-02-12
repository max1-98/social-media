import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TextField,
    Button,
    Typography,
    Grid2,
    Alert,
    Card,
    AlertTitle,
    Dialog,
    DialogTitle,
    DialogActions,
    DialogContent,
  } from '@mui/material';
import { handleLogin } from '../functions/auth_functions';
import loginBackground from './login_background2.gif';
import axios from 'axios';


function Login(props) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [forgotPassword, setForgotPassword] = useState(false);
    const [Response, setResponse] = useState('');
    const [good, setGood] = useState(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    

    const handleSubmitEmail = async (e) => {
        try {
            const response = await axios.post('http://localhost:8000/authorization/request_reset/', {
            email: email
            });
            setResponse(response.data.detail);
            setGood(true);
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
            setResponse(errorMessage); // Set the error message
            setGood(false);
        }
    };


    const handleClose = () => {
        setForgotPassword(false);
        setGood(null);
        setResponse('');
        setEmail('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        handleLogin({username:username, password:password, setError:setError, setIsAuthenticated:props.setIsAuthenticated, navigate: navigate});
    };

    return (
        <div
            style={{
                backgroundImage: `url(${loginBackground})`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center center',
                width: '100vw',
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
        <Grid2 container justifyContent="center" alignItems="center" height="100vh">
            <Grid2 item xs={12} md={4}>
                <Card
                    sx={{
                        padding: 4,
                        borderRadius: 2,
                        boxShadow: 3,
                        opacity:0.95,
                    }}
                >
                
                <Typography variant="h4" gutterBottom align="center" sx={{fontWeight:1000}}>
                    The Club Hub
                </Typography>
                <Typography variant="body1" gutterBottom align="center">
                    Enter your login details below to get playing.
                </Typography>


                <form onSubmit={handleSubmit}>
                    <TextField
                    label="Username"
                    fullWidth
                    margin="normal"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    />
                    <TextField
                    label="Password"
                    fullWidth
                    margin="normal"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    />
                    { !(error==='') && (
                        <Alert severity='error'>
                            <AlertTitle>Login Error</AlertTitle>
                            <Typography>{error}</Typography>
                        </Alert>
                    )}
                    <Button type="submit" variant="contained" color="secondary" fullWidth sx={{ mt: 2 }}>
                        Login
                    </Button>
                </form>

                <Typography variant="body2" align="center" mt={2}>
                    Don't have an account? <Button onClick={()=> navigate("/account/register/")} color="secondary">Register</Button> 
                    <br/>
                    Forgot your password? <Button color="secondary" onClick={()=>setForgotPassword(true)}>Reset password</Button>
                    
                </Typography>
                </Card>
            </Grid2>
        </Grid2>
        <Dialog
            open={forgotPassword}
            onClose={handleClose}
        >
            <DialogTitle>Forgot Password?</DialogTitle>
            <DialogContent>
                <form onSubmit={handleSubmitEmail}>
                <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    margin="normal"
                    color="common"
                />
                </form>
                {!(good === null) &&
                    <Alert severity={good ? 'info' : 'error'}>

                        {Response}
                    </Alert>
                }
          
            </DialogContent>
            <DialogActions>
                { good ?
                (<Button color="success" variant="contained" onClick={handleClose}>Complete</Button>)
                :
                (<>
                    <Button type="submit" variant="contained" color="secondary" onClick={()=> handleSubmitEmail()}>Submit</Button>
                    <Button color="error" variant="contained" onClick={handleClose}>Cancel</Button>
                </>)
                }
            </DialogActions>
        </Dialog>
        </div>
    );
}

export default Login;