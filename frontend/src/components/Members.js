import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom'; // Import Link

function MemberDetail() { // Remove the props argument
  const [members, setMembers] = useState([]); // Use an array to store all clubs
  const { clubId } = useParams();

  const fetchMembers = async (club_id) => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/club/members/${club_id}/`, {
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('access_token'),
          'Content-Type': 'application/json',
          accept: 'application/json',
      }
      }); 
      console.log('Response Data:', response.data);
      setMembers(response.data); // Update the state with all clubs
    } catch (error) {
      console.error('Error fetching clubs:', error);
    }
  };

  useEffect(() => {
    fetchMembers(clubId)
  }, []); // Empty dependency array to only fetch once

  const handleDelete = async (memberId) => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
      };

      // Send a DELETE request to the backend to remove the member request
      await axios.delete(`http://127.0.0.1:8000/club/member/${memberId}/`, { headers });

      // Update the memberRequests state (you'll need to refetch from the backend)
      fetchMembers(clubId);
    }
      catch (error) {
          console.error('Error deleting member request:', error);
      }
  }

    

  if (members.length === 0) { // Check if there are any clubs
    return <div>Loading...</div>; 
  }

  return (
    <div>
      <h2>All members</h2>
      <ul>
        {members.map((member) => (
          <li key={member.id}>
            <p><b>{member.username}</b> - {member.first_name} {member.surname}</p> <button onClick={()=> handleDelete(member.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>

  );
}

export default MemberDetail;