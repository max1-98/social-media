import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Typography,
  Grid2,
  Select,
  MenuItem,
  Stack,
  Alert,
  Paper,
  Card,
  Box,
  TextField,
  useTheme,
} from '@mui/material';
import { fetchSocials } from '../functions/fetch_functions';

function SocialForm() {

    const navigate = useNavigate();
    const { clubId } = useParams();
    const [error, setError] = useState('');
    const [ socials, setSocials] = useState([]);
    const [socialsDict, setSocialsDict] = useState({});
    const theme = useTheme();

    const handleChange = (platform, value) => {
        setSocialsDict({ ...socialsDict, [platform]: value });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            const token = localStorage.getItem('access_token');
            const headers = {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'multipart/form-data',
                accept: 'application/json',
            };
            const response = await axios.post(
                `http://127.0.0.1:8000/club/edit/socials/${clubId}/`,
                { 
                    "facebook": socialsDict.facebook ? socialsDict.facebook : "",
                    "whatsapp": socialsDict.whatsapp ? socialsDict.whatsapp : "",
                    "instagram": socialsDict.instagram ? socialsDict.instagram : "",
                    "website": socialsDict.website ? socialsDict.website: "",
                },
                { headers }
            );

            navigate(`/club/${clubId}`);
        } catch (error) {
            setError(error.response.data.detail || 'Error creating club.');
            console.error('Error creating club:', error);
        }
    };

    useEffect(() => {
        fetchSocials(clubId, setSocials, setError);
    }, []);

    useEffect(() => {
        const createSocialsDict = () => {
            // Initialize with empty strings or default values (if needed)
            const socialsDict = {
                facebook: '',
                instagram: '',
                whatsapp: '',
                website: '',
            };
            socials.socials.forEach((social) => {
                
                socialsDict[social.platform] = social.url;
            });

            return socialsDict;
        };

        if (socials.socials){
            setSocialsDict(createSocialsDict());
        };
        
    }, [socials]);

    if (!(socialsDict)) {
        return(<Typography>1{socialsDict.facebook}2</Typography>)
    };
    
    return (
        <Paper sx={{p:3, height: "100vh"}}>
            
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                {error}
                </Alert>
            )}
            <Card sx={{p:2, textAlign:"center", justifyItems:"center", backgroundColor: theme.palette.userprofile.card, color: theme.palette.userprofile.cardContrastText}}>
                <form onSubmit={handleSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: "100%", gap: 2 }}>
                        <Typography variant="h6">Update Social Media Links</Typography>
                        <TextField
                            label="Facebook"
                            variant="outlined"
                            value={socialsDict.facebook}
                            onChange={(e) => handleChange('facebook', e.target.value)}
                            fullWidth
                        />
                        <TextField
                            label="Instagram"
                            variant="outlined"
                            value={socialsDict.instagram}
                            onChange={(e) => handleChange('instagram', e.target.value)}
                            fullWidth
                        />
                        <TextField
                            label="Whatsapp"
                            variant="outlined"
                            value={socialsDict.whatsapp}
                            onChange={(e) => handleChange('whatsapp', e.target.value)}
                            fullWidth
                        />
                        <TextField
                            label="Website"
                            variant="outlined"
                            value={socialsDict.website}
                            onChange={(e) => handleChange('website', e.target.value)}
                            fullWidth
                        />
                        <Button type="submit" variant="contained" color="primary" sx={{ marginTop: 2 }}>Save Changes</Button>
                    </Box>
                </form>
            </Card>
        </Paper>
    );
}

export default SocialForm;