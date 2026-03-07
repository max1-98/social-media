import axios from "axios";
import { fetchClub, fetchEvent, fetchMembers } from "./fetch_functions";



// Handles activation of users
export const handleActivate = async (member_id, event_id, setMembers, setEvent, setAMembers, setInGameMembers) => {
    try {
        await axios.post(`http://127.0.0.1:8000/club/event/activate-member/`,
        {
            member_id: member_id,
            event_id: event_id,
        }
      );
      fetchMembers(event_id, setMembers);
      fetchEvent(event_id, setEvent, setAMembers, setInGameMembers);

    } catch (error) {
    }
  };


export const handleDeactivate = async (member_id, event_id, setMembers, setEvent, setAMembers, setInGameMembers) => {
    try {
        await axios.post(`http://127.0.0.1:8000/club/event/deactivate-member/`,
        {
            member_id: member_id,
            event_id: event_id,
        }
      );
      fetchMembers(event_id, setMembers);
      fetchEvent(event_id, setEvent, setAMembers, setInGameMembers);

    } catch (error) {
    }
  };