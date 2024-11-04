import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
    TextField,
    Button,
    Typography,
    Grid2,
    Box,
    Alert,
    Card,
  } from '@mui/material';


function Login(props) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            const response = await axios.post('http://127.0.0.1:8000/auth/token/', {
                client_id: 'ai21cVtLBNXSaGQ3QwklqOfxmdH3DOEB21iP2VwO',
                client_secret: 'cn5upUUXY7gGPEkIccB1AZEIhCUR4h0V9MGY9jD7630HVqyY2kyN7NjoVjkx0EMxDwUVqKNugTdeUa5nD8fsXbewAopFjG9BCFNt5KSyYSYj1wf9CVrAlFxQsQq9GF5S',
                grant_type: 'password',
                username: username,
                password: password,
                
            }
            );

            // Store tokens in local storage
            localStorage.setItem('access_token', response.data.access_token);
            localStorage.setItem('refresh_token', response.data.refresh_token);
            props.setIsAuthenticated(true);
            navigate("/")
            console.log('Login successful!'); 
            

        } catch (error) {
            setError(error.response.data.detail || 'Login failed.'); // Handle specific error messages from your API
            console.error('Login error:', error);
        }
    };

    return (
        <Grid2 container justifyContent="center" alignItems="center" height="100vh">
            <Grid2 item xs={12} md={4}>
                <Card
                    sx={{
                        padding: 4,
                        borderRadius: 2,
                        boxShadow: 3,
                    }}
                >
                
                <Typography variant="h4" gutterBottom align="center">
                    Welcome to [website name]!
                </Typography>
                <Typography variant="body1" gutterBottom align="center">
                    In order to use the functionality of this website, you need to
                    login.
                </Typography>

                <Typography variant="h5" gutterBottom align="center">
                    Login
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                    </Alert>
                )}

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
                    <Button type="submit" variant="contained" color="secondary" fullWidth sx={{ mt: 2 }}>
                        Login
                    </Button>
                </form>

                <Typography variant="body2" align="center" mt={2}>
                    Don't have an account? Click{' '}
                    <Link to="/account/register/">here</Link> to register.
                </Typography>
                </Card>
            </Grid2>
        </Grid2>
    );
}

export default Login;