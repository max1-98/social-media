import { Button, Card, Paper } from "@mui/material";
import { fetchEvent } from "../../functions/fetch_functions";
import axios from "axios";


function BeforeStart(event, setEvent, setAMembers, setInGameMembers) {

    const handleStart = async(event_id) => {
    
        try {
          const token = localStorage.getItem('access_token');
          const headers = {
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json',
              accept: 'application/json',
          }
          const response = await axios.post(`http://127.0.0.1:8000/club/event/start/`, 
          {
              event_id: event.id,
          },
          {headers}
        );
        fetchEvent(event_id, setEvent, setAMembers, setInGameMembers);
        } catch (error) {
          console.error('Error fetching event:', error);
        }
      };
return (
    <Paper sx={{p:10}}>
      <Button onClick={() => handleStart(event.id)} color={"secondary"}>Start event</Button>
    </Paper>
)};

export default BeforeStart;