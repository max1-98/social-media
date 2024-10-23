import React, { useEffect, useState } from 'react';
import './App.css';
import ClubDetail from './components/Clubs/Clubs';
import ClubPage from './components/Clubs/ClubPage';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CreateClub from './components/Clubs/CreateClub';

import Login from './components/Account/Login';
import Logout from './components/Account/Logout';
import UserProfile from './components/Account/UserProfile';
import Register from './components/Account/Register';
import EditClub from './components/Clubs/EditClub';
import ClubRequests from './components/Clubs/ClubRequests';
import Navbar from './components/Navbar/Navbar'
import { Container, Paper } from '@mui/material';
import MemberDetail from './components/Clubs/Members';
import EventsDetail from './components/Events/Events';
import CreateEvent from './components/Events/CreateEvent';
import EventPage from './components/Events/EventView';
import MemberAttendanceComponent from './components/Clubs/Attendance';
import MyClubsList from './components/Clubs/MyClubs';

function App() {
  
  const token = localStorage.getItem('access_token');
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);


  useEffect(() => {

    const initialToken = localStorage.getItem('access_token');
    if (initialToken) {
      setIsAuthenticated(true)
    } else {
      setIsAuthenticated(false);
    }
  
    const handleStorageChange = () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);
  
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  return (
    <div style={{ display: 'flex' }}>
      <Router>
        {isAuthenticated && <Navbar />}
        <Container style={{ marginLeft: 0 }}>
          <Routes>
            <Route path="/" element={<ClubDetail />} />
            <Route path="/club/myClubs" element={<MyClubsList />} />
            <Route path="/club/:clubId" element={isAuthenticated ? <ClubPage /> : <Navigate to="/account/login" />} /> 
            <Route path="/club/edit/:clubId" element={isAuthenticated ? <EditClub /> : <Navigate to="/account/login" />} />
            <Route path="/club/attendance/:clubId" element={isAuthenticated ? <MemberAttendanceComponent /> : <Navigate to="/account/login" />} />
            <Route path="/club/create" element={isAuthenticated ? <CreateClub /> : <Navigate to="/account/login" />} />
            <Route path="/account/profile" element={isAuthenticated ? <UserProfile /> : <Navigate to="/account/login" />} />
            <Route path="/account/logout" element={isAuthenticated ? <Logout setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/account/login" />} />
            <Route path="/club/requests/:clubId" element={isAuthenticated ? <ClubRequests /> : <Navigate to="/account/login" />} />
            <Route path="/club/members/:clubId" element={isAuthenticated ? <MemberDetail /> : <Navigate to="/account/login" />} />
            <Route path="/club/events/:clubId" element={isAuthenticated ? <EventsDetail /> : <Navigate to="/account/login" />} />
            <Route path="/club/events/create/:clubId" element={isAuthenticated ? <CreateEvent /> : <Navigate to="/account/login" />} />
            <Route path="/club/event/:clubId/:eventId" element={isAuthenticated ? <EventPage /> : <Navigate to="/account/login" />} />
            <Route path="/account/login" element={!isAuthenticated ? <Login setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/" />} />
            <Route path="/account/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
          </Routes>
        </Container>
      </Router>
    </div>
  );
}

export default App;
