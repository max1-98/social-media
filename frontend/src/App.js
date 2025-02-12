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
import { Box, Container, Grid2 } from '@mui/material';
import MemberDetail from './components/Clubs/Members';
import EventsDetail from './components/Events/Events';
import CreateEvent from './components/Events/CreateEvent';
import EventPage from './components/Events/EventView';
import MemberAttendanceComponent from './components/Clubs/Attendance';
import MyClubsList from './components/Clubs/MyClubs';
import PastGames from './components/Account/PastGames';
import GameTypeElos from './components/Account/GameTypeElos';
import SocialForm from './components/Clubs/AddSocials';
import AddressForm from './components/Clubs/AddressForm';
import SportForm from './components/Clubs/SportForm';
import PasswordReset from './components/Account/ResetPassword';
import VerifyEmail from './components/Account/VerifyEmail';

// Theme
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ColorModeContext, useMode } from './theme';
import SideNav from './components/Navbar/Navbar2';
import { ProSidebarProvider } from 'react-pro-sidebar';



function App() {
  
  const token = localStorage.getItem('access_token');
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [collapsed, setCollapsed] = React.useState(false);
  const [theme, colorMode] = useMode();

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
    <ColorModeContext.Provider value={colorMode}>
      <div style={{ display: 'flex' }}>
        <ThemeProvider theme={theme}>
          
          <CssBaseline />
          <Router>
            <ProSidebarProvider>
              {isAuthenticated &&  (<SideNav setIsAuthenticated={setIsAuthenticated}/>)}
            </ProSidebarProvider>
            
            <Box style={{ width: "100%" }}>
              <Routes>
                <Route path="/" element={isAuthenticated ? <ClubDetail /> : <Navigate to="/account/login" />} />

                {/* Club components */}
                <Route path="/club/:clubId" element={isAuthenticated ? <ClubPage/> : <Navigate to="/account/login" />} /> 
                <Route path="/club/edit/:clubId" element={isAuthenticated ? <EditClub/> : <Navigate to="/account/login" />} />
                <Route path="/club/attendance/:clubId" element={isAuthenticated ? <MemberAttendanceComponent/> : <Navigate to="/account/login" />} />
                <Route path="/club/create" element={isAuthenticated ? <CreateClub/> : <Navigate to="/account/login" />} />
                <Route path="/club/requests/:clubId" element={isAuthenticated ? <ClubRequests/> : <Navigate to="/account/login" />} />
                <Route path="/club/members/:clubId" element={isAuthenticated ? <MemberDetail/> : <Navigate to="/account/login" />} />
                <Route path="/club/events/create/:clubId" element={isAuthenticated ? <CreateEvent/> : <Navigate to="/account/login" />} />
                <Route path="/club/event/:clubId/:eventId" element={isAuthenticated ? <EventPage/> : <Navigate to="/account/login" />} />
                <Route path="/club/address/:clubId" element={isAuthenticated ? <AddressForm/> : <Navigate to="/account/login"/>}/>
                <Route path="/club/add-sport/:clubId" element={isAuthenticated ? <SportForm/>: <Navigate to="/account/login"/>}/>
                <Route path="/club/add-socials/:clubId" element={isAuthenticated ? <SocialForm/>: <Navigate to="/account/login"/>}/>
                
                {/* Account components */}
                <Route path="/account/past-games" element={isAuthenticated ? < PastGames/> : <Navigate to="/account/login"/>}/>
                <Route path="/account/profile" element={isAuthenticated ? <UserProfile/> : <Navigate to="/account/login" />} />
                <Route path="/account/login" element={!isAuthenticated ? <Login setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/" />} />
                <Route path="/account/register" element={!isAuthenticated ? <Register/> : <Navigate to="/" />} />
                <Route path="/account/reset-password/:token" element={<PasswordReset/>} />
                <Route path="/account/verify_email/:token" element={<VerifyEmail/>}/>
              </Routes>
            </Box>
          </Router>
          
        </ThemeProvider>
      </div>
    </ColorModeContext.Provider>
  );
}

export default App;
