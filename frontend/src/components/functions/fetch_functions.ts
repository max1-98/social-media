import axios from 'axios';
import type {
  EventDetail,
  Event,
  CompleteGame,
  Club,
  Game,
  MyClub,
  ManyClub,
  Member,
  MemberEvent,
  MemberRequest,
  Sport,
  Elo,
  User,
} from '../../types';

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

export const fetchEvent = async (
  event_id: number | string,
  setEvent: SetState<EventDetail | null>,
  setAMembers: SetState<Member[]>,
  setInGameMembers: SetState<Member[]>
): Promise<void> => {
  try {
    const response = await axios.get<EventDetail>(`http://127.0.0.1:8000/club/event/${event_id}/`);
    setEvent(response.data);
    setAMembers(response.data.active_members);
    setInGameMembers(response.data.in_game_members);
  } catch (error) {
  }
};

interface FetchClubEventsProps {
  club_id: number | string;
  setUpcomingEvents: SetState<Event[]>;
  setActiveEvents: SetState<Event[]>;
  setCompletedEvents: SetState<Event[]>;
  setError: SetState<unknown>;
}

export const fetchClubEvents = async (props: FetchClubEventsProps): Promise<void> => {
  try {
    const response = await axios.get<Event[]>(`http://127.0.0.1:8000/club/events/${props.club_id}/`);

    props.setUpcomingEvents(response.data.filter(event => !event.event_active)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    props.setActiveEvents(response.data.filter(event => event.event_active && !event.event_complete)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    props.setCompletedEvents(response.data.filter(event => event.event_active && event.event_complete)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

  } catch (error) {
    props.setError(error);
  }
};

export const fetchCompleteEventGames = async (
  event_id: number | string,
  setGames: SetState<CompleteGame[]>
): Promise<void> => {
  try {
    const response = await axios.get<CompleteGame[]>(`http://127.0.0.1:8000/game/event/games/${event_id}/`);
    setGames(response.data);
  } catch (error) {
  }
};

export const fetchClub = async (
  club_id: number | string,
  setClub: SetState<Club | null>
): Promise<void> => {
  try {
    const response = await axios.get<Club>(`http://127.0.0.1:8000/club/${club_id}/`);
    setClub(response.data);
  } catch (error) {
  }
};

export const fetchGames = async (
  event_id: number | string,
  setGames: SetState<Game[]>
): Promise<void> => {
  try {
    const response = await axios.get<Game[]>(`http://127.0.0.1:8000/game/games/${event_id}`);
    setGames(response.data);
  } catch (error) {
  }
};

export const fetchSocials = async (
  club_id: number | string,
  setSocials: SetState<{ socials: string }>,
  setError: SetState<unknown>
): Promise<void> => {
  try {
    const response = await axios.get(`http://127.0.0.1:8000/clubs/${club_id}/socials/`);
    setSocials(response.data);
  } catch (error) {
    setError(error);
  }
};

interface FetchMyClubsProps {
  setClubs: SetState<MyClub[]>;
  setError: SetState<unknown>;
}

export const fetchMyClubs = async (props: FetchMyClubsProps): Promise<void> => {
  try {
    const response = await axios.get<MyClub[]>('http://127.0.0.1:8000/club/my-clubs/');
    props.setClubs(response.data);
  } catch (error) {
    props.setError(error);
  }
};

interface FetchClubMembersProps {
  club_id: number | string;
  setError: SetState<unknown>;
  setMembers: SetState<Member[]>;
}

export const fetchClubMembers = async (props: FetchClubMembersProps): Promise<void> => {
  try {
    const response = await axios.get<Member[]>(
      `http://127.0.0.1:8000/club/members/${props.club_id}/`
    );
    props.setMembers(response.data);
  } catch (error) {
    props.setError(error);
  }
};

export const fetchMembers = async (
  event_id: number | string,
  setMembers: SetState<MemberEvent[]>
): Promise<void> => {
  try {
    const response = await axios.get<MemberEvent[]>(`http://127.0.0.1:8000/club/members/event/${event_id}/`);
    setMembers(response.data);
  } catch (error) {
  }
};

export const fetchStats = async (
  event_id: number | string,
  setStats: SetState<unknown>
): Promise<void> => {
  try {
    const response = await axios.get(`http://127.0.0.1:8000/club/event/${event_id}/stats/`);
    setStats(response.data);
  } catch (error) {
  }
};

interface FetchUserGamesProps {
  setGames: SetState<CompleteGame[]>;
  setError: SetState<unknown>;
}

export const fetchUserGames = async (props: FetchUserGamesProps): Promise<void> => {
  try {
    const response = await axios.get<CompleteGame[]>(`http://127.0.0.1:8000/game/users/games/`);
    props.setGames(response.data);
  } catch (error) {
    props.setError(error);
  }
};

export const fetchUserGames_game_type = async (
  setGames: SetState<CompleteGame[]>,
  game_type: string
): Promise<void> => {
  try {
    const response = await axios.get<CompleteGame[]>(`http://127.0.0.1:8000/game/users/games/?game_type=${game_type}`);
    setGames(response.data);
  } catch (error) {
  }
};

interface FetchUserDataProps {
  setUserData: SetState<User | null>;
  setError: SetState<unknown>;
}

export const fetchUserData = async (props: FetchUserDataProps): Promise<void> => {
  try {
    const response = await axios.get<User>('http://127.0.0.1:8000/account/profile/');
    props.setUserData(response.data);
  } catch (error) {
    props.setError(error);
  }
};

interface FetchUserElosProps {
  username: string;
  setElos: SetState<Elo[]>;
  setError: SetState<unknown>;
}

export const fetchUserElos = async (props: FetchUserElosProps): Promise<void> => {
  try {
    const response = await axios.get<Elo[]>(
      `http://127.0.0.1:8000/elo/elos/${props.username}/`
    );
    props.setElos(response.data);
  } catch (error) {
    props.setError(error);
  }
};

interface FetchMemberRequestsProps {
  club_id: number | string;
  setMemberRequests: SetState<MemberRequest[]>;
  setError: SetState<unknown>;
}

export const fetchMemberRequests = async (props: FetchMemberRequestsProps): Promise<void> => {
  try {
    const response = await axios.get<MemberRequest[]>(`http://127.0.0.1:8000/club/requests/` + props.club_id);
    props.setMemberRequests(response.data);
  } catch (error) {
    props.setError(error);
  }
};

interface FetchSportsProps {
  setSports: SetState<Sport[]>;
  setError: SetState<unknown>;
}

export const fetchSports = async (props: FetchSportsProps): Promise<void> => {
  try {
    const response = await axios.get<Sport[]>(
      `http://127.0.0.1:8000/club/add-sport/`
    );
    props.setSports(response.data);
  } catch (error) {
    props.setError(error);
  }
};

interface FetchClubsProps {
  ne: { lat: number; lng: number } | null;
  sw: { lat: number; lng: number } | null;
  sport: string;
  setClubs: SetState<ManyClub[]>;
  setError: SetState<unknown>;
  setCoordUrl: SetState<string>;
  CoordUrl: string;
}

export const fetchClubs = async (props: FetchClubsProps): Promise<void> => {
  try {
    if (props.ne && props.sw) {
      if (props.sport) {
        props.setCoordUrl(`?southwest_lat=${props.sw.lat}&southwest_lng=${props.sw.lng}&northeast_lat=${props.ne.lat}&northeast_lng=${props.ne.lng}`);
      }
      else {
        props.setCoordUrl(`?southwest_lat=${props.sw.lat}&southwest_lng=${props.sw.lng}&northeast_lat=${props.ne.lat}&northeast_lng=${props.ne.lng}`);
      }
    }
    const response = await axios.get<ManyClub[]>(`http://127.0.0.1:8000/clubs/${props.sport}${props.CoordUrl}`);
    props.setClubs(response.data);

  } catch (error) {
    props.setError(error);
  }
};
