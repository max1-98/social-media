import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function CreateClub() {
    const [name, setName] = useState('');
    const [club_username, setCUsername] = useState('');
    const [sport, setSport] = useState('badminton');
    const [info, setInfo] = useState('');
    const [website, setWebsite] = useState('');
    const [signupLink, setSignupLink] = useState('');
    const [logo, setLogo] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault(); 

        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('club_username', club_username);
            formData.append('sport', sport);
            formData.append('info', info);
            formData.append('website', website);
            formData.append('signup_link', signupLink);
            
            if (logo) {
                formData.append('logo', logo);
            }

            const response = await axios.post('http://127.0.0.1:8000/clubs/', formData, { // Replace with your API URL
                headers: {
                    'Content-Type': 'multipart/form-data', // Set the correct header for FormData
                    Authorization: `Token ${localStorage.getItem('token')}` // Include the token in the header
                }
            });

            console.log('Club created:', response.data);
            console.log(response.data.id);
            navigate('/club/'+response.data.id);
            
        } catch (error) {
            console.error('Error creating club:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>Create a New Club</h2>
            <div>
                <label htmlFor="name">Name:</label>
                <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required // Make name a required field
                />
            </div>
            <div>
                <label htmlFor="club_username">Club username:</label>
                <input
                type="text"
                id="club_username"
                value={club_username}
                onChange={(e) => setCUsername(e.target.value)}
                required // Make name a required field
                />
            </div>
            <div>
                <label htmlFor="sport">Sport:</label>
                <select id="sport" value={sport} onChange={(e) => setSport(e.target.value)}>
                    <option value="badminton">Badminton</option>
                    <option value="tennis">Tennis</option>
                    <option value="paddle">Paddle</option>
                </select>
            </div>
            <div>
                <label htmlFor="info">Club description:</label>
                <textarea
                    id="info"
                    value={info}
                    onChange={(e) => setInfo(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="website">Club Website:</label>
                <input
                    type="url"
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="signup_link">Club Sign-up Link:</label>
                <input
                    type="url"
                    id="signup_link"
                    value={signupLink}
                    onChange={(e) => setSignupLink(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="logo">Club Logo:</label>
                <input
                    type="file"
                    id="logo"
                    accept="image/*" // Only allow image files
                    onChange={(e) => setLogo(e.target.files[0])}
                />
            </div>
            <button type="submit">Create</button>
        </form>
    );
}

export default CreateClub;