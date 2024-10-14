import React, { useState, useEffect } from 'react';
import axios from 'axios';

function UserProfile() {
    const [userData, setUserData] = useState(null); 
    const [elos, setElos] = useState([]);

    const fetchUserData = async () => {
        try {
            const token = localStorage.getItem('access_token'); 
            if (token) {
                const response = await axios.get('http://127.0.0.1:8000/account/profile/', {
                    headers: {
                        Authorization: 'Bearer ' + token,
                        'Content-Type': 'application/json',
                        accept: 'application/json',
                    }
                });
                setUserData(response.data);
                
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            // Handle errors (e.g., token expired, unauthorized)
        }
    };

    const fetchElos = async () => {
        try {
            const token = localStorage.getItem('access_token'); 
            if (token) {
                const response = await axios.get(`http://127.0.0.1:8000/elo/elos/${userData.username}/`, {
                    headers: {
                        Authorization: 'Bearer ' + token,
                        'Content-Type': 'application/json',
                        accept: 'application/json',
                    }
                });
                setElos(response.data);
                
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            // Handle errors (e.g., token expired, unauthorized)
        }
    };
    

    useEffect(() => {
        fetchUserData(); 
    }, []); // Fetch data only once on mount

    useEffect(() => {
        if (userData) {
            fetchElos();
        }
    }, [userData]); 

    if (!userData) {
        return <div>Loading user data...</div>;
    }
    

    return (
        <div>
            <h2>User Profile</h2>
            <p>Name: {userData.first_name} {userData.surname}</p>
            <p>Email: {userData.email}</p>
            <p>Date of Birth: {userData.date_of_birth}</p>
            <p>Followers: {userData.follower_count}</p>
            <p>Following: {userData.following_count}</p>
        </div>
    );
}

export default UserProfile;