
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom'; // Import Link
import { fetchMemberRequests } from '../functions/fetch_functions';
import {
    Typography,
    Button,
    Link,
    Stack,
    Paper,
    Card,
    Grid2,
    AppBar,
    Toolbar,
    AlertTitle,
    Alert,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Badge,
    Box,
    useTheme,
    useMediaQuery,
    Drawer,
    Tooltip,
    List,
    ListItem,
    Divider,
  } from '@mui/material';

function ClubRequests() {
     
    const { clubId } = useParams();
    const [memberRequests, setMemberRequests] = useState([]);
    const [error, setError] = useState('');

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
            fetchMemberRequests({club_id: clubId, setMemberRequests: setMemberRequests, setError: setError});
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
            fetchMemberRequests({club_id: clubId, setMemberRequests: setMemberRequests, setError: setError});
        }
    }, [clubId]);


    return (
        <Paper sx={{p:2, height: memberRequests.length>0 ? "100%" : "100vh"}}>
            <Typography variant="h4" sx={{fontWeight:800}}>Member Requests</Typography>
            { memberRequests.length > 0 ? (
                <>
                    <List>
                        <Divider/>
                        {memberRequests.map((request) => (
                            <>
                                <ListItem key={request.id}>
                                    {request.username} requested to join on {new Date(request.date_requested).toLocaleDateString()} 
                                    <Button onClick={() => handleAccept(request.id)} color="secondary">Accept</Button>
                                    <Button onClick={()=> handleDelete(request.id)} color="error">Decline</Button>
                                </ListItem>
                                <Divider/>
                            </>
                        ))}
                    </List>
                </>
            )
            :
            (
                <Typography>There are no member requests currently.</Typography>
            )
            }
        
        </Paper>
    );
}

export default ClubRequests;

