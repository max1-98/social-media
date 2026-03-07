import React, { Suspense } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ColorModeContext, useMode } from './theme';
import SideNav from './components/Navbar/Navbar2';
import { ProSidebarProvider } from 'react-pro-sidebar';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Eagerly loaded — visible on initial page load
import Login from './components/Account/Login';
import Register from './components/Account/Register';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy loaded — code-split per route
const ClubDetail = React.lazy(() => import('./components/Clubs/Clubs'));
const ClubPage = React.lazy(() => import('./components/Clubs/ClubPage'));
const CreateClub = React.lazy(() => import('./components/Clubs/CreateClub'));
const EditClub = React.lazy(() => import('./components/Clubs/EditClub'));
const ClubRequests = React.lazy(() => import('./components/Clubs/ClubRequests'));
const MemberDetail = React.lazy(() => import('./components/Clubs/Members'));
const CreateEvent = React.lazy(() => import('./components/Events/CreateEvent'));
const EventPage = React.lazy(() => import('./components/Events/EventView'));
const MemberAttendanceComponent = React.lazy(() => import('./components/Clubs/Attendance'));
const PastGames = React.lazy(() => import('./components/Account/PastGames'));
const SocialForm = React.lazy(() => import('./components/Clubs/AddSocials'));
const AddressForm = React.lazy(() => import('./components/Clubs/AddressForm'));
const SportForm = React.lazy(() => import('./components/Clubs/SportForm'));
const PasswordReset = React.lazy(() => import('./components/Account/ResetPassword'));
const VerifyEmail = React.lazy(() => import('./components/Account/VerifyEmail'));
const UserProfile = React.lazy(() => import('./components/Account/UserProfile'));

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <ProSidebarProvider>
        {isAuthenticated && <SideNav />}
      </ProSidebarProvider>

      <Box style={{ width: "100%" }}>
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
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
        </Suspense>
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
