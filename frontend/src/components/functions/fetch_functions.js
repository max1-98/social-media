import axios from 'axios';



export const fetchEvent = async (event_id, setEvent, setAMembers, setInGameMembers) => {

    try {
        const token = localStorage.getItem('access_token');
        const headers_get =   {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
        }
      const response = await axios.get(`http://127.0.0.1:8000/club/event/${event_id}/`, {
      headers: headers_get
    });
        setEvent(response.data);
        setAMembers(response.data.active_members);
        setInGameMembers(response.data.in_game_members)
    
    } catch (error) {
        console.error('Error fetching event:', error);
    }
  };

export const fetchCompleteEventGames = async (event_id, setGames) => {

    try {
        const token = localStorage.getItem('access_token');
        const headers_get =   {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
        }
      const response = await axios.get(`http://127.0.0.1:8000/game/event/games/${event_id}/`, {
      headers: headers_get
    });
        setGames(response.data);
    } catch (error) {
        console.error('Error fetching event:', error);
    }
  };
  
export const fetchClub = async (club_id, setClub) => {

    try {
        const token = localStorage.getItem('access_token');
        const headers_get =   {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
        }
        const response = await axios.get(`http://127.0.0.1:8000/club/${club_id}/`, {
        headers: headers_get
    });

        setClub(response.data);
    } catch (error) {
      console.error('Error fetching club:', error);
    }
  };

export const fetchGames = async (event_id, setGames) => {

    try {
        const token = localStorage.getItem('access_token');
        const headers_get =   {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
        }
        const response = await axios.get(`http://127.0.0.1:8000/game/games/${event_id}`, {
        headers: headers_get
    });

        setGames(response.data);
    } catch (error) {
      console.error('Error fetching club:', error);
    }
  };


export const fetchMembers = async (event_id, setMembers) => {

    try {
        const token = localStorage.getItem('access_token');
        const headers_get =   {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
        }
        const response = await axios.get(`http://127.0.0.1:8000/club/members/event/${event_id}/`, {
            headers: headers_get
        }); 

        setMembers(response.data);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    }
  };

export const fetchStats = async (event_id, setStats) => {
  try {
      const token = localStorage.getItem('access_token');
      const headers_get =   {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          accept: 'application/json',
      }
      const response = await axios.get(`http://127.0.0.1:8000/club/event/${event_id}/stats/`, {
          headers: headers_get
      }); 
      console.log(response.data)
      setStats(response.data);
  } catch (error) {
    console.error('Error fetching clubs:', error);
  }

  };