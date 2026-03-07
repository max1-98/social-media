// Core domain types derived from backend serializers

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  surname: string;
  date_of_birth: string | null;
  biological_gender: string;
}

export interface NavbarUser {
  username: string;
  email: string;
  first_name: string;
  surname: string;
  email_verify: boolean;
}

export interface Sport {
  name: string;
}

export interface GameType {
  name: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Social {
  platform: string;
  url: string;
}

export interface Club {
  id: number;
  club_username: string;
  name: string;
  sport_type: Sport;
  president: string;
  info: string;
  date_created: string;
  logo: string;
  address: string;
  coordinates: Coordinates | null;
  is_club_admin: boolean;
  is_club_president: boolean;
  membership_status: number;
  is_active: boolean;
  is_event_upcoming: boolean;
  average_attendance: number | string;
  member_requests: number;
}

export interface MyClub {
  id: number;
  name: string;
  logo: string;
  sport_type: Sport;
}

export interface ManyClub {
  id: number;
  club_username: string;
  name: string;
  sport_type: Sport;
  info: string;
  logo: string;
  coordinates: Coordinates | null;
  is_active: boolean;
  is_event_upcoming: boolean;
  average_attendance: number | string;
}

export interface Member {
  id: number;
  first_name: string;
  surname: string;
  username: string;
  is_club_admin: boolean;
}

export interface MemberEvent {
  id: number;
  first_name: string;
  surname: string;
  username: string;
  elo: number | null;
}

export interface MemberRequest {
  id: number;
  club: number;
  user: number;
  username: string;
  date_requested: string;
}

export interface EventClub {
  id: number;
  name: string;
  logo: string;
}

export interface Event {
  id: number;
  date: string;
  start_time: string;
  finish_time: string;
  number_of_courts: number;
  sbmm: boolean;
  guests_allowed: boolean;
  over_18_under_18_mixed: string;
  event_active: boolean;
  event_complete: boolean;
  club: EventClub;
  game_type: GameType;
}

export interface EventDetail {
  id: number;
  game_type: GameType;
  date: string;
  start_time: string;
  finish_time: string;
  number_of_courts: number;
  sbmm: boolean;
  guests_allowed: boolean;
  over_18_under_18_mixed: string;
  active_members: Member[];
  in_game_members: Member[];
  event_active: boolean;
  event_complete: boolean;
  mode: string;
  even_teams: boolean;
  team_size: number;
}

export interface Game {
  id: number;
  team1: MemberEvent[];
  team2: MemberEvent[];
}

export interface CompleteGame {
  id: number;
  team1: MemberEvent[];
  team2: MemberEvent[];
  game_type: number;
  score: string;
  start_time: string;
}

export interface Elo {
  game_type: string;
  elo: number;
  winstreak: number;
  last_game: string | null;
  best_winstreak: number;
  winrate: number;
  total_games: number;
  sport: string;
  style: string;
  wins: number;
}

export interface ApiError {
  error: string;
  code?: string;
  detail?: string;
}
