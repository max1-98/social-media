import React from 'react';
import './App.css';
import ClubDetail from './components/Clubs/Clubs';
import ClubPage from './components/Clubs/ClubPage';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CreateClub from './components/Clubs/CreateClub';

import Login from './components/Account/Login';
import UserProfile from './components/Account/UserProfile';
import Register from './components/Account/Register';
import EditClub from './components/Clubs/EditClub';
import ClubRequests from './components/Clubs/ClubRequests';
import { Box } from '@mui/material';
import MemberDetail from './components/Clubs/Members';
import CreateEvent from './components/Events/CreateEvent';
import EventPage from './components/Events/EventView';
import MemberAttendanceComponent from './components/Clubs/Attendance';
import PastGames from './components/Account/PastGames';
import SocialForm from './components/Clubs/AddSocials';
import AddressForm from './components/Clubs/AddressForm';
import SportForm from './components/Clubs/SportForm';
import PasswordReset from './components/Account/ResetPassword';
import VerifyEmail from './components/Account/VerifyEmail';
import ErrorBoundary from './components/ErrorBoundary';

// Theme
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ColorModeContext, useMode } from './theme';
import SideNav from './components/Navbar/Navbar2';
import { ProSidebarProvider } from 'react-pro-sidebar';

// Auth context
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <ProSidebarProvider>
        {isAuthenticated && <SideNav />}
      </ProSidebarProvider>

      <Box style={{ width: "100%" }}>
        <Routes>
          <Route path="/" element={isAuthenticated ? <ErrorBoundary><ClubDetail /></ErrorBoundary> : <Navigate to="/account/login" />} />

          {/* Club components */}
          <Route path="/club/:clubId" element={isAuthenticated ? <ErrorBoundary><ClubPage/></ErrorBoundary> : <Navigate to="/account/login" />} />
          <Route path="/club/edit/:clubId" element={isAuthenticated ? <ErrorBoundary><EditClub/></ErrorBoundary> : <Navigate to="/account/login" />} />
          <Route path="/club/attendance/:clubId" element={isAuthenticated ? <ErrorBoundary><MemberAttendanceComponent/></ErrorBoundary> : <Navigate to="/account/login" />} />
          <Route path="/club/create" element={isAuthenticated ? <ErrorBoundary><CreateClub/></ErrorBoundary> : <Navigate to="/account/login" />} />
          <Route path="/club/requests/:clubId" element={isAuthenticated ? <ErrorBoundary><ClubRequests/></ErrorBoundary> : <Navigate to="/account/login" />} />
          <Route path="/club/members/:clubId" element={isAuthenticated ? <ErrorBoundary><MemberDetail/></ErrorBoundary> : <Navigate to="/account/login" />} />
          <Route path="/club/events/create/:clubId" element={isAuthenticated ? <ErrorBoundary><CreateEvent/></ErrorBoundary> : <Navigate to="/account/login" />} />
          <Route path="/club/event/:clubId/:eventId" element={isAuthenticated ? <ErrorBoundary><EventPage/></ErrorBoundary> : <Navigate to="/account/login" />} />
          <Route path="/club/address/:clubId" element={isAuthenticated ? <ErrorBoundary><AddressForm/></ErrorBoundary> : <Navigate to="/account/login"/>}/>
          <Route path="/club/add-sport/:clubId" element={isAuthenticated ? <ErrorBoundary><SportForm/></ErrorBoundary> : <Navigate to="/account/login"/>}/>
          <Route path="/club/add-socials/:clubId" element={isAuthenticated ? <ErrorBoundary><SocialForm/></ErrorBoundary> : <Navigate to="/account/login"/>}/>

          {/* Account components */}
          <Route path="/account/past-games" element={isAuthenticated ? <ErrorBoundary><PastGames/></ErrorBoundary> : <Navigate to="/account/login"/>}/>
          <Route path="/account/profile" element={isAuthenticated ? <ErrorBoundary><UserProfile/></ErrorBoundary> : <Navigate to="/account/login" />} />
          <Route path="/account/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
          <Route path="/account/register" element={!isAuthenticated ? <Register/> : <Navigate to="/" />} />
          <Route path="/account/reset-password/:token" element={<PasswordReset/>} />
          <Route path="/account/verify_email/:token" element={<VerifyEmail/>}/>
        </Routes>
      </Box>
    </>
  );
}

function App() {
  const [theme, colorMode] = useMode();

  return (
    <AuthProvider>
      <ColorModeContext.Provider value={colorMode}>
        <div style={{ display: 'flex' }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
              <AppRoutes />
            </Router>
          </ThemeProvider>
        </div>
      </ColorModeContext.Provider>
    </AuthProvider>
  );
}

export default App;
