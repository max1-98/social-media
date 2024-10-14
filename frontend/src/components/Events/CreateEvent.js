import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

function CreateEvent() {
    const { clubId } = useParams();
    const [sport, setSport] = useState('');
    const [date, setDate] = useState('');
    const [start_time, setST] = useState('');
    const [finish_time, setFT] = useState('');
    const [number_of_courts, setNOC] = useState('');
    const [sbmm, setSBMM] = useState(true);
    const [guests_allowed, setGA] = useState(false);
    const [over_18_under_18_mixed, setOUM] = useState('all ages');
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault(); 

        try {

            const data = {
                sport: sport,
                date: date,
                start_time: start_time,
                finish_time: finish_time,
                number_of_courts: number_of_courts,
                sbmm: sbmm.toString(),
                guests_allowed: guests_allowed.toString(),
                over_18_under_18_mixed: over_18_under_18_mixed,
            };

        

            const token = localStorage.getItem('access_token')
            const headers = {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json',
                accept: 'application/json',
              }
            const response = await axios.post(`http://127.0.0.1:8000/club/event/create/${clubId}/`, 
                data,
                {headers: headers}
            );
            console.log(response.data)
            navigate(`/club/event/${clubId}/${response.data.id}`);
            
        } catch (error) {
            console.error('Error creating club:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>Create a New Event</h2>
            <div>
                <label htmlFor="sport">Sport:</label>
                <select id="sport" value={sport} onChange={(e) => setSport(e.target.value)}>
                    <option value="badminton_singles">Badminton Singles</option>
                    <option value="badminton_doubles">Badminton Doubles</option>
                    <option value="tennis_singles">Tennis Singles</option>
                    <option value="tennis_doubles">Tennis Doubles</option>
                    <option value="paddle_singles">Paddle Singles</option>
                    <option value="paddle_doubles">Paddle Doubles</option>
                </select>
            </div>
            <div>
                <label htmlFor="date">Date:</label>
                <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required // Make name a required field
                />
            </div>
            <div>
                <label htmlFor="start_time">Start time:</label>
                <input
                type="time"
                id="start_time"
                value={start_time}
                onChange={(e) => setST(e.target.value)}
                required // Make name a required field
                />
            </div>
            <div>
                <label htmlFor="finish_time">Finish time:</label>
                <input
                type="time"
                id="finish_time"
                value={finish_time}
                onChange={(e) => setFT(e.target.value)}
                required // Make name a required field
                />
            </div>
            <div>
                <label htmlFor="number_of_courts">Number of courts:</label>
                <input
                type="number"
                id="number_of_courts"
                value={number_of_courts}
                onChange={(e) => setNOC(parseInt(e.target.value, 10))} 
                min="1" // Enforces minimum value of 1
                required
                />
            </div>
            <div>
                <label htmlFor="sbmm">Skill based match-making:</label>
                <input
                type="checkbox" // Use "checkbox" for boolean fields
                id="sbmm"
                checked={sbmm} // Use the "checked" attribute to control checkbox state
                onChange={(e) => setSBMM(e.target.checked)} // Update the state based on checkbox status
                />
            </div>
            <div>
                <label htmlFor="guests_allowed">Guests Allowed:</label>
                <input
                type="checkbox" // Use "checkbox" for boolean fields
                id="guests_allowed"
                checked={guests_allowed} // Use the "checked" attribute to control checkbox state
                onChange={(e) => setGA(e.target.checked)} // Update the state based on checkbox status
                />
            </div>
            <div>
                <label htmlFor="over_18_under_18_mixed">Age groups allowed:</label>
                <select id="over_18_under_18_mixed" value={over_18_under_18_mixed} onChange={(e) => setOUM(e.target.value)}>
                    <option value="over_18">Over 18</option>
                    <option value="under_18">Under 18</option>
                    <option value="all ages">All ages</option>
                </select>
            </div>
            <button type="submit">Create</button>
        </form>
    );
}

export default CreateEvent;