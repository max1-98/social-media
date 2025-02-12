import React, { useState } from 'react';
import { TextField, Button, Grid2, Typography, Paper, Alert, AlertTitle } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const AddressForm = () => {
    const navigate = useNavigate();
    const { clubId } = useParams();
    const [addressFields, setAddressFields] = useState({
        street: '',
        town: '',
        county: '',
        postcode: '',
    });

    const handleChange = (event) => {
        setAddressFields({
        ...addressFields,
        [event.target.name]: event.target.value,
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const fullAddress = [
        addressFields.street,
        addressFields.town,
        addressFields.county,
        addressFields.postcode,
        ].filter(Boolean).join(','); 

        try {
        const token = localStorage.getItem('access_token');
        const headers = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'multipart/form-data',
            accept: 'application/json',
        };
        const response = await axios.post(
            'http://127.0.0.1:8000/club/add-address/',
            {
                club_id: clubId,
                address: fullAddress
            },
            { headers }
        );
        navigate(`/club/${clubId}`);

        
        } catch (error) {
        console.error('Error during API request:', error);
        }
    };

  return (
    <Paper sx={{width:"100%", p:1, height:"100vh"}}>
      <Grid2 container spacing={2} alignItems="center">
        <Grid2 item size={12}>
          <Typography variant="h6" gutterBottom>
            Enter club session address
          </Typography>
        </Grid2>
        <Grid2 item>
        <Alert severity="info">
          <AlertTitle>Entering an address</AlertTitle>
          We use Google Maps API. Enter as much info about the address that you know and then click submit, it should handle the rest. If it finds the wrong address then find the address using Google Maps and re-enter.
        </Alert>
        </Grid2>
        <Grid2 item size={12}>
          <TextField
            label="Street"
            name="street"
            value={addressFields.street}
            onChange={handleChange}
            fullWidth
          />
        </Grid2>
        <Grid2 item size={{xs:12,sm:6}}>
          <TextField
            label="Town"
            name="town"
            value={addressFields.town}
            onChange={handleChange}
            fullWidth
          />
        </Grid2>
        <Grid2 item size={{xs:12,sm:6}}>
          <TextField
            label="County"
            name="county"
            value={addressFields.county}
            onChange={handleChange}
            fullWidth
          />
        </Grid2>
        <Grid2 item size={12}>
          <TextField
            label="Postcode"
            name="postcode"
            value={addressFields.postcode}
            onChange={handleChange}
            fullWidth
          />
        </Grid2>
        <Grid2 item size={12}>
          <Button color="secondary" variant="contained" onClick={handleSubmit}>
            Submit Address
          </Button>
        </Grid2>
      </Grid2>
    </Paper>
    
  );
};

export default AddressForm;