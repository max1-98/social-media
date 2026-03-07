import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { fetchClub, fetchClubEvents, fetchSocials } from '../components/functions/fetch_functions';

const ClubContext = createContext(null);

export function ClubProvider({ children }) {
  const { clubId } = useParams();
  const [club, setClub] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [activeEvents, setActiveEvents] = useState([]);
  const [completedEvents, setCompletedEvents] = useState([]);
  const [socials, setSocials] = useState([]);
  const [error, setError] = useState('');

  const refreshClub = useCallback(() => {
    if (clubId) {
      fetchClub(clubId, setClub);
    }
  }, [clubId]);

  const refreshEvents = useCallback(() => {
    if (clubId) {
      fetchClubEvents({
        club_id: clubId,
        setUpcomingEvents,
        setActiveEvents,
        setCompletedEvents,
        setError,
      });
    }
  }, [clubId]);

  const refreshSocials = useCallback(() => {
    if (clubId) {
      fetchSocials(clubId, setSocials, setError);
    }
  }, [clubId]);

  useEffect(() => {
    refreshClub();
    refreshEvents();
    refreshSocials();
  }, [refreshClub, refreshEvents, refreshSocials]);

  const isAdmin = club?.is_club_admin ?? false;
  const isPresident = club?.is_club_president ?? false;
  const isMember = club?.membership_status === 2;
  const membershipStatus = club?.membership_status ?? null;

  const value = {
    clubId,
    club,
    setClub,
    isAdmin,
    isPresident,
    isMember,
    membershipStatus,
    upcomingEvents,
    activeEvents,
    completedEvents,
    socials,
    error,
    refreshClub,
    refreshEvents,
    refreshSocials,
  };

  return (
    <ClubContext.Provider value={value}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  const context = useContext(ClubContext);
  if (!context) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return context;
}

export default ClubContext;
