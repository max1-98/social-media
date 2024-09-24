import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom'; // Import useParams

function ClubPage() {
  const [club, setClub] = useState(null);
  const { clubId } = useParams(); // Get clubId from the URL
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClub = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/club/${clubId}/`, {}, {
            headers: {
              Authorization: `Token ${localStorage.getItem('token')}` // Include the token in the header
            }
          });
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

    const handleDelete = async (event) => {
        event.preventDefault(); 

        try {

            const response = await axios.delete('http://127.0.0.1:8000/club/'+clubId, {}, {
                headers: {
                  Authorization: `Token ${localStorage.getItem('token')}` // Include the token in the header
                }
              });

            console.log('Club deleted');
            navigate('/');
            
        } catch (error) {
            console.error('Error deleting club: ', error);
        }
    };

  return (
    <>
        <div>
            <h2>{club.name}</h2>
            <p>Sport: {club.sport}</p>
        </div>
        <div>
            <button onClick={handleDelete}>Delete club</button>
        </div>
    </>

    
  );
}

export default ClubPage;
