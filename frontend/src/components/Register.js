import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; 

function Register() {
    const navigate = useNavigate(); 
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [first_name, setFN] = useState('');
    const [surname, setSN] = useState('');
    const [date_of_birth, setDOB] = useState('');
    const [biological_gender, setBG] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);

    

    const handleSubmit = async (event) => {
        event.preventDefault(); 

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        try {
            const response = await axios.post('http://127.0.0.1:8000/account/register/', {
                username,
                email,
                first_name,
                surname,
                date_of_birth,
                biological_gender,
                password,
            });

            console.log('Registration successful:', response.data);
            navigate('/account/login'); // Redirect to login after successful registration 
        } catch (error) {
            setError(error.response.data.detail || 'Registration failed.'); 
            console.error('Registration error:', error);
        }
    };

    return (
        <div>
            <h2>Register</h2>
            {error && <p className="error">{error}</p>} 
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
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="first_name">First name:</label>
                    <input
                        type="text"
                        id="first_name"
                        value={first_name}
                        onChange={(e) => setFN(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="surname">Surname:</label>
                    <input
                        type="text"
                        id="Surname"
                        value={surname}
                        onChange={(e) => setSN(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="date_of_birth">Date of birth:</label>
                    <input
                        type="date"
                        id="date_of_birth"
                        value={date_of_birth}
                        onChange={(e) => setDOB(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="biological_gender">Biological gender:</label>
                    <div>
                        <input 
                            type="radio" 
                            id="male" 
                            name="biological_gender" 
                            value="male" 
                            checked={biological_gender === 'male'}
                            onChange={(e) => setBG(e.target.value)}
                        />
                        <label htmlFor="male">Male</label>
                    </div>

                    <div>
                        <input 
                            type="radio" 
                            id="female" 
                            name="biological_gender" 
                            value="female" 
                            checked={biological_gender === 'female'}
                            onChange={(e) => setBG(e.target.value)}
                        />
                        <label htmlFor="female">Female</label>
                    </div>
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
                <div>
                    <label htmlFor="confirmPassword">Confirm Password:</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>
                <button type="submit">Register</button>
            </form>
        </div>
    );
}

export default Register;