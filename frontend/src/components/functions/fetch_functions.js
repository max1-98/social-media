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
        console.log(response.data);
        setAMembers(response.data.active_members);
        setInGameMembers(response.data.in_game_members);
    
    } catch (error) {
        console.error('Error fetching event:', error);
    }
  };

export const fetchClubEvents = async (props) => {
  /*
    Args:
      - club_id
      - setUpcomingEvents
      - setActiveEvents
      - setCompletedEvents
      - setError
  */
    try {
      const response = await axios.get(`http://127.0.0.1:8000/club/events/${props.club_id}/`, {
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('access_token'),
          'Content-Type': 'application/json',
          accept: 'application/json',
      }
      }); 

      
      props.setUpcomingEvents(response.data.filter(event => !event.event_active)
        .sort((a, b) => new Date(a.date) - new Date(b.date))); // Sort upcoming by soonest
      props.setActiveEvents(response.data.filter(event => event.event_active && !event.event_complete)
        .sort((a, b) => new Date(b.date) - new Date(a.date))); // Sort active by most recent
      props.setCompletedEvents(response.data.filter(event => event.event_active && event.event_complete)
        .sort((a, b) => new Date(b.date) - new Date(a.date))); // Sort completed by most recent
      
    } catch (error) {
      props.setError(error)
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

export const fetchSocials = async (club_id, setSocials, setError) => {

  try {
    const token = localStorage.getItem('access_token');
    const headers_get =   {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        accept: 'application/json',
    };
    const response = await axios.get(`http://127.0.0.1:8000/clubs/${club_id}/socials/`, {
      headers: headers_get
    });

    setSocials(response.data);
  } catch (error) {
    console.error('Error fetching club:', error);
    setError(error);
  }
};

export const fetchMyClubs = async (props) => {
  /*
    Args:
      - setClubs
      - setError
  */
  try {
    const token = localStorage.getItem('access_token');
    const headers = {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      accept: 'application/json',
    };
    const response = await axios.get('http://127.0.0.1:8000/club/my-clubs/', { headers });
    props.setClubs(response.data);
  } catch (error) {
    console.error('Error fetching data:', error);
    props.setError(error);
  }
};

export const fetchClubMembers = async (props) => {
  /*
    Args:
      - club_id
      - setError
      - setMembers
  */
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/club/members/${props.club_id}/`,
        {
          headers: {
            Authorization: 'Bearer ' + localStorage.getItem('access_token'),
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        }
      );
      props.setMembers(response.data);
    } catch (error) {
      props.setError(error)
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
      console.log(response.data);
      setStats(response.data);
  } catch (error) {
    console.error('Error fetching clubs:', error);
  }

  };

export const fetchUserGames = async (props) => {
  /*
    Args:
      - setGames
      - setError
  */

  try {
    const token = localStorage.getItem('access_token');
    const headers =   {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        accept: 'application/json',
    }
    const response = await axios.get(`http://127.0.0.1:8000/game/users/games/`, {
    headers: headers
    });
    props.setGames(response.data);
    console.log(response.data);
  
  } catch (error) {
    console.error('Error fetching games:', error);
    props.setError(error);
  }
};

export const fetchUserGames_game_type = async (setGames, game_type) => {

    try {
      const token = localStorage.getItem('access_token');
      const headers =   {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          accept: 'application/json',
      }
      const response = await axios.get(`http://127.0.0.1:8000/game/users/games/?game_type=${game_type}`, {
      headers: headers
    });
        setGames(response.data);
    } catch (error) {
        console.error('Error fetching games:', error);
    }
  };

export const fetchUserData = async (props) => {
  /*
    Args:
      - setUserData
      - setError
  */
  try {
    const token = localStorage.getItem('access_token');
    if (token) {
      const response = await axios.get(
        'http://127.0.0.1:8000/account/profile/',
        {
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        }
      );
      props.setUserData(response.data);
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    props.setError(error);
  }
};

export const fetchUserElos = async (props) => {
  /*
    Args:
      - username
      - setElos
      - setError
  */
  try {
    const token = localStorage.getItem('access_token');
    if (token) {
      const response = await axios.get(
        `http://127.0.0.1:8000/elo/elos/${props.username}/`,
        {
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        }
      );
      props.setElos(response.data);
    }
  } catch (error) {
    props.setError(error);
  }
};

export const fetchMemberRequests = async (props) => {
  /*
    Args:
      - club_id
      - setMemberRequests
      - setError
  */
  try {
  const response = await axios.get(`http://127.0.0.1:8000/club/requests/` + props.club_id, {
      headers: {
          Authorization: 'Bearer ' + localStorage.getItem('access_token'),
          'Content-Type': 'application/json',
          accept: 'application/json',
      }
  });

  // You can now access the member requests in `response.data`
  props.setMemberRequests(response.data);

  } catch (error) {
    props.setError(error);
  }
};

export const fetchSports = async (props) => {
  /*
    Args:
      - setSports
      - setError
  */
  try {
    const token = localStorage.getItem('access_token');
    const response = await axios.get(
      `http://127.0.0.1:8000/club/add-sport/`,
      {
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
      }
    );
    props.setSports(response.data);
  } catch (error) {
    props.setError(error);
  }
};

export const fetchClubs = async (props) => {
  /*
    Arg:
      - ne
      - sw
      - sport
      - setClubs
      - setError
      - setCoordUrl
      - CoordUrl
  */
  try {
    if (props.ne && props.sw) {
      if (props.sport){
        props.setCoordUrl(`?southwest_lat=${props.sw.lat}&southwest_lng=${props.sw.lng}&northeast_lat=${props.ne.lat}&northeast_lng=${props.ne.lng}`);
      }
      else {
        props.setCoordUrl(`?southwest_lat=${props.sw.lat}&southwest_lng=${props.sw.lng}&northeast_lat=${props.ne.lat}&northeast_lng=${props.ne.lng}`);
      }
    }
    const response = await axios.get(`http://127.0.0.1:8000/clubs/${props.sport}${props.CoordUrl}`, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('access_token'),
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    });
    props.setClubs(response.data);
    
  } catch (error) {
    props.setError(error);
  }
};