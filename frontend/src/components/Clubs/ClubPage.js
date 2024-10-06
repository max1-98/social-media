import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom'; // Import useParams

function ClubPage() {
  const [club, setClub] = useState(null);
  const { clubId } = useParams(); // Get clubId from the URL
  const navigate = useNavigate();

  const fetchClub = async (club_id) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`http://127.0.0.1:8000/club/${club_id}/`, {
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        accept: 'application/json',
      }
    });
    setClub(response.data);
  } catch (error) {
    console.error('Error fetching club:', error);
  }
  };

  useEffect(() => {
    if (clubId) {
      fetchClub(clubId);
    }
  }, []);


  const createMemberRequest = async (clubId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post('http://127.0.0.1:8000/club/request/create/', { club: clubId }, {
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        accept: 'application/json',
      }
      });
      
      // Handle the response (e.g., show a success message)
      console.log('Member request sent successfully');
      fetchClub(clubId);
      } catch (error) {
        console.error('Error creating member request:', error);
        // Handle errors appropriately
      }
    };

    const cancelMemberRequest = async (clubId) => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await axios.post('http://127.0.0.1:8000/club/request/cancel/', { club: clubId }, {
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          accept: 'application/json',
        }})
        fetchClub(clubId);
      } catch (error) {
        console.error('Error deleting member request:', error);
      }
    };

    if (!club) {
        return <div>Loading...</div>;
    }


    const handleDelete = async (event) => {
        event.preventDefault(); 

        try {
          const token = localStorage.getItem('access_token');
            const response = await axios.delete('http://127.0.0.1:8000/club/'+clubId+'/', {
                headers: {
                  Authorization: 'Bearer ' + token,
                  'Content-Type': 'application/json',
                  accept: 'application/json',
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
        <p>President: {club.president ? club.president : "No president"}</p> 
        <p>Info: {club.info}</p>
        <p>Website: <a href={club.website} target="_blank" rel="noopener noreferrer">{club.website}</a></p>
        <p>Signup Link: <a href={club.signup_link} target="_blank" rel="noopener noreferrer">{club.signup_link}</a></p>
        <p>Created: {new Date(club.date_created).toLocaleDateString()}</p> 
      </div>

      <div>
        {/* Admin Actions */}
        {club.is_club_admin && (
          <>
            <button onClick={() => navigate('/club/edit/' + clubId)}>Edit club</button>
            <button onClick={() => navigate(`/club/requests/${clubId}`)}>Member requests</button>
            <button onClick={()=>navigate(`/club/members/${clubId}`)}>Members</button>
          </>
        )}

        {/* President Actions (if not already an admin) */}
        {club.is_club_president && (
          <>
            <button onClick={handleDelete}>Delete club</button>
          </>
        )}

        {/* Non-Admin Actions */}
        
        <>
          {club.membership_status === 0 && (
            <button onClick={() => createMemberRequest(clubId)}>Request to join</button>
          )}
          {club.membership_status === 1 && (
            <button onClick={()=> cancelMemberRequest(clubId)}>Cancel request</button>
          )}
          {club.membership_status === 2 && (
            <>
              <button>Deactivate membership</button>
              <button onClick={()=> navigate(`/club/events/${clubId}`)}>Events</button>
            </>
          )}
        </>

      </div>
    </>
  );
}

export default ClubPage;
