import React, { useEffect, useState } from 'react';
import './App.css';
import ClubDetail from './components/Clubs';
import ClubPage from './components/ClubPage';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CreateClub from './components/CreateClub';
//import Navbar from './components/NavBar';
import Login from './components/Login';
import Logout from './components/Logout';
import UserProfile from './components/UserProfile';
import Register from './components/Register';
import axios from 'axios';
import EditClub from './components/EditClub';
import ClubRequests from './components/ClubRequests';
import Navbar from './components/Navbar/Navbar'
import { Container } from '@mui/material';
import MemberDetail from './components/Members';



function App() {
  
  const token = localStorage.getItem('token');
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  useEffect(() => {
    // A. Function for asking Django whether the token is valid
    /*
    const verifyToken = async (token) => {
      try {
        const response = await axios.post('http://127.0.0.1:8000/account/verify-token/', {}, {
          headers: {
            Authorization: `Token ${token}`
          }
        });
        setIsAuthenticated(response.data.valid);
      } catch (error) {
        console.error('Error verifying token:', error);
        setIsAuthenticated(false);
      }
    };
    */

    // 1. Initial Check:
    const initialToken = localStorage.getItem('access_token');
    if (initialToken) {
      //verifyToken(initialToken);
      setIsAuthenticated(true)
    } else {
      setIsAuthenticated(false);
    }
  
    // 2. Token Verification Interval:
    /*
    const intervalId = setInterval(async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        verifyToken(token);
      }
    }, 60000); // Verify every 60 seconds = 60000 milliseconds
    */
  
    // 3. Local Storage Change Listener:
    const handleStorageChange = () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        setIsAuthenticated(true);
        //verifyToken(token);
      } else {
        setIsAuthenticated(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);
  
    // 4. Cleanup on Unmount:
    return () => {
      //clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  return (
    <div style={{ display: 'flex' }}> 
      <Router>
        {isAuthenticated && <Navbar/>}  {/* Show navbar only if logged in */}
        <Container style={{ marginLeft: 0 }}>
          <Routes>
          {/* Redirect to login if not authenticated */}
          {/* Main content area */}
            <Route path="/" element={isAuthenticated ? <ClubDetail/> : <Navigate to="/account/login" />}/> 
            <Route path="/club/:clubId" element={isAuthenticated ? <ClubPage /> : <Navigate to="/account/login" />}/>
            <Route path="/club/edit/:clubId" element={isAuthenticated ? <EditClub /> : <Navigate to="/account/login" />} />
            <Route path="/club/create" element={isAuthenticated ? <CreateClub /> : <Navigate to="/account/login" />} />
            <Route path="/account/profile" element={isAuthenticated ? <UserProfile /> : <Navigate to="/account/login" />} />
            <Route path="/account/logout" element={isAuthenticated ? <Logout setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/account/login" />} /> 
            <Route path="/club/requests/:clubId" element={isAuthenticated ? <ClubRequests/> : <Navigate to="/account/login" />} />
            <Route path="/club/members/:clubId" element={isAuthenticated ? <MemberDetail/> : <Navigate to="/account/login" />} /> 
          </Routes>
        </Container>

        <Routes>
          {/* Login and Registration Route */}
          <Route path="/account/login" element={!isAuthenticated ? <Login setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/" />} />
          <Route path="/account/register" element={!isAuthenticated ? <Register /> : <Navigate to="/"/>} /> 
        </Routes>
      </Router>
    </div>
  );
}

export default App;
