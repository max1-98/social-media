
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom'; // Import Link


function ClubRequests() { // Remove the props argument
    const { clubId } = useParams();
    const [memberRequests, setMemberRequests] = useState([]);

    const fetchMemberRequests = async (clubId) => {
        try {
        const response = await axios.get(`http://127.0.0.1:8000/club/requests/`+clubId, {
            headers: {
                Authorization: 'Bearer ' + localStorage.getItem('access_token'),
                'Content-Type': 'application/json',
                accept: 'application/json',
            }
        });
    
        // You can now access the member requests in `response.data`
        setMemberRequests(response.data);
        console.log(clubId)
        } catch (error) {
        console.error('Error fetching member requests:', error);
        }
    };
    const handleAccept = async (requestId) => {
        try {
            const token = localStorage.getItem('access_token');
            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                accept: 'application/json',
            };

            // Send a GET request to the backend to remove the member request
            await axios.get(`http://127.0.0.1:8000/club/request-accept/${requestId}/${clubId}/`, 
                { headers }
            );


            // Update the memberRequests state (you'll need to refetch from the backend)
            fetchMemberRequests(clubId);
        } catch (error) {
            console.error('Error accepting member request:', error);
        }
    };
    const handleDelete = async (requestId) => {
        try {
            const token = localStorage.getItem('access_token');
            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                accept: 'application/json',
            };

            // Send a GET request to the backend to remove the member request
            await axios.delete(`http://127.0.0.1:8000/club/request-accept/${requestId}/${clubId}/`, { headers });

            // Update the memberRequests state (you'll need to refetch from the backend)
            fetchMemberRequests(clubId);
        }
        catch (error) {
            console.error('Error deleting member request:', error);
        }
    }

    useEffect(() => {
        if (clubId) {
            fetchMemberRequests(clubId);
        }
    }, [clubId]);

    if (memberRequests.length === 0) { // Check if there are any clubs
        return <div>There are no requests.</div>; 
    }

    return (
        <div>
        <h2>Member Requests for Club {clubId}</h2>
        <ul>
            {memberRequests.map((request) => (
            <li key={request.id}>
                {request.username} requested to join on {new Date(request.date_requested).toLocaleDateString()}. 
                <button onClick={() => handleAccept(request.id)}>Accept</button>
                <button onClick={()=> handleDelete(request.id)}>Decline</button>
            </li>
            ))}
        </ul>
        
        </div>
    );
}

export default ClubRequests;

