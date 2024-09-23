import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';


function Login(props) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            const response = await axios.post('http://127.0.0.1:8000/account/login/', {
                username,
                password,
            });

            // Store tokens in local storage
            localStorage.setItem('token', response.data.token);
            props.setIsAuthenticated(true);
            navigate("/")
            console.log('Login successful!'); 
            

        } catch (error) {
            setError(error.response.data.detail || 'Login failed.'); // Handle specific error messages from your API
            console.error('Login error:', error);
        }
    };

    return (
        <div>
            <h1>Welcome to [website name]!</h1>
            <p>In order to use the functionality of this website you need to login.</p>
            <h2>Login</h2>
            {error && <p className="error">{error}</p>} {/* Display error if there is one */}
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="username">Username:</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <button type="submit">Login</button>
            </form>
            <p>Don't have an account? Click <Link to="/account/register/">here</Link> to register.</p>
        </div>
    );
}

export default Login;