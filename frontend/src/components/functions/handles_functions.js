import axios from "axios";
import { fetchClub, fetchEvent, fetchMembers } from "./fetch_functions";



// Handles activation of users
export const handleActivate = async (member_id, event_id, setMembers, setEvent, setAMembers, setInGameMembers) => {
    try {
        const token = localStorage.getItem('access_token');

        const headers_post = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            accept: 'application/json',
        };
        
        const response = await axios.post(`http://127.0.0.1:8000/club/event/activate-member/`, 
        {
            member_id: member_id,
            event_id: event_id,
        },
        {headers: headers_post}
      );
      fetchMembers(event_id, setMembers);
      fetchEvent(event_id, setEvent, setAMembers, setInGameMembers);

    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };


export const handleDeactivate = async (member_id, event_id, setMembers, setEvent, setAMembers, setInGameMembers) => {
    try { 
        const token = localStorage.getItem('access_token');

        const headers_post = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
        }
        const response = await axios.post(`http://127.0.0.1:8000/club/event/deactivate-member/`, 
        {
            member_id: member_id,
            event_id: event_id,
        },
        {headers: headers_post}
      );
      fetchMembers(event_id, setMembers);
      fetchEvent(event_id, setEvent, setAMembers, setInGameMembers);

    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };