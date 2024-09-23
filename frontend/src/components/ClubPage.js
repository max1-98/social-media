import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom'; // Import useParams

function ClubPage() {
  const [club, setClub] = useState(null);
  const { clubId } = useParams(); // Get clubId from the URL

  useEffect(() => {
    const fetchClub = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/club/${clubId}/`);
        setClub(response.data);
      } catch (error) {
        console.error('Error fetching club:', error);
      }
    };

    if (clubId) {
      fetchClub();
    }
  }, [clubId]);

  if (!club) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>{club.name}</h2>
      <p>Sport: {club.sport}</p>
      {/* Display other club details */}
    </div>
  );
}

export default ClubPage;
