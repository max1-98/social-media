import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; // Import Link

function ClubDetail() { // Remove the props argument
  const [clubs, setClubs] = useState([]); // Use an array to store all clubs

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/clubs/`, {
          headers: {
            Authorization: 'Bearer ' + localStorage.getItem('access_token'),
            'Content-Type': 'application/json',
            accept: 'application/json',
        }
        }); 
        console.log('Response Data:', response.data);
        console.log(clubs)
        setClubs(response.data); // Update the state with all clubs
      } catch (error) {
        console.error('Error fetching clubs:', error);
      }
    };

    fetchClubs(); // Fetch clubs on component mount
  }, []); // Empty dependency array to only fetch once

  if (clubs.length === 0) { // Check if there are any clubs
    return <div>Loading...</div>; 
  }

  return (
    <div>
      <h2>All Clubs</h2>
      <ul>
        {clubs.map((club, index) => (
          <li key={index}> 
            <Link to={`/club/${club.id}`}> {/* Link to the club detail page */}
              <h3>{club.name}</h3>
            </Link>
            <p>Sport: {club.sport}</p>
          </li>
        ))}
      </ul>
      <h3>
        Click <Link to="/club/create">here</Link> to create a club.
      </h3>
    </div>

  );
}

export default ClubDetail;