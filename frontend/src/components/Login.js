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
            console.log(password)
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