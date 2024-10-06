import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';



function EditClub() {
    const [club, setClub] = useState(null);
    const { clubId } = useParams(); // Get clubId from the URL
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [club_username, setCUsername] = useState('');
    const [sport, setSport] = useState('');
    const [info, setInfo] = useState('');
    const [website, setWebsite] = useState('');
    const [signup_link, setSignupLink] = useState('');
    const [logo, setLogo] = useState(null); // Store the File object

    useEffect(() => {
        const fetchClub = async () => {
        try {
            const response = await axios.get(`http://127.0.0.1:8000/club/${clubId}/`, {}, {
                headers: {
                    Authorization: 'Bearer ' + localStorage.getItem('access_token'),
                    'Content-Type': 'application/json',
                    accept: 'application/json',
                }
            });
            setName(response.data.name);
            setCUsername(response.data.club_username);
            setSport(response.data.sport);
            setInfo(response.data.info);
            setWebsite(response.data.website);
            setSignupLink(response.data.signup_link);
            setLogo(response.data.logo ? new URL(response.data.logo) : null);
        } catch (error) {
            console.error('Error fetching club:', error);
            return (
                <div><h1>Club may have been deleted.</h1></div>
            )
        }
        };

        if (clubId) {
        fetchClub();
        }
    }, [clubId]);

    const onSubmit = async (data) => {

        try {
            const formData = new FormData();
            formData.append('name', data.name);
            formData.append('club_username', data.club_username);
            formData.append('sport', data.sport);
            formData.append('info', data.info);
            formData.append('website', data.website);
            formData.append('signup_link', data.signup_link);
            
            if (logo) {
                formData.append('logo', logo);
            }

            const response = await axios.put('http://127.0.0.1:8000/club/edit/'+clubId+"/", formData, { // Replace with your API URL
                headers: {
                    'Content-Type': 'multipart/form-data', // Set the correct header for FormData
                    Authorization: `Token ${localStorage.getItem('token')}` // Include the token in the header
                }
            });
            
            navigate('/club/'+response.data.id);
            
        } catch (error) {
            console.error('Error creating club:', error);
        }
    };
    
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
      } = useForm()
    
      return (
        /* "handleSubmit" will validate your inputs before invoking "onSubmit" */
        <form onSubmit={handleSubmit(onSubmit)}>
            <h1>Welcome to my form!</h1>
            <h3>Name:</h3>
            <input defaultValue={name} {...register("name", { required: true })} />
        
            <h3>Club Username</h3>
            <input defaultValue={club_username} {...register("club_username", { required: true })} />

            <h3>Club Sport</h3>
            <select defaultValue={sport} {...register("sport", { required: true })}>
                <option value="badminton">Badminton</option>
                <option value="tennis">Squash</option>
                <option value="paddle">Paddle</option>
            </select>

            <h3>Club Description</h3>
            <input defaultValue={info} {...register("info", { required: true })} />

            <h3>Club website</h3>
            <input defaultValue={website} {...register("website", { required: true })} />

            <h3>Club sign-up link</h3>
            <input defaultValue={signup_link} {...register("signup_link", { required: true })} />


          {errors.exampleRequired && <span>This field is required</span>}

          <input type="submit" />
        </form>
      )
    


}

export default EditClub;
