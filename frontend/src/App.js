import React, { useEffect, useState } from 'react';
import './App.css';
import ClubDetail from './components/Clubs';
import ClubPage from './components/ClubPage';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CreateClub from './components/CreateClub';
import Navbar from './components/NavBar';
import Login from './components/Login';
import Logout from './components/Logout';
import UserProfile from './components/UserProfile';
import Register from './components/Register';
import axios from 'axios';

function App() {
  
  const token = localStorage.getItem('token');
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  useEffect(() => {
    // A. Function for asking Django whether the token is valid
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

    // 1. Initial Check:
    const initialToken = localStorage.getItem('token');
    if (initialToken) {
      verifyToken(initialToken);
    } else {
      setIsAuthenticated(false);
    }
  
    // 2. Token Verification Interval:
    const intervalId = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (token) {
        verifyToken(token);
      }
    }, 60000); // Verify every 60 seconds = 60000 milliseconds
  
    // 3. Local Storage Change Listener:
    const handleStorageChange = () => {
      const token = localStorage.getItem('token');
      if (token) {
        verifyToken(token);
      } else {
        setIsAuthenticated(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);
  
    // 4. Cleanup on Unmount:
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  return (
      <Router>
        {isAuthenticated && <Navbar isAuthenticated={isAuthenticated} />}  {/* Show navbar only if logged in */}
          <Routes>
            {/* Redirect to login if not authenticated */}
            <Route path="/" element={isAuthenticated ? <ClubDetail/> : <Navigate to="/account/login" />}/> 
            <Route path="/club/:clubId" element={isAuthenticated ? <ClubPage /> : <Navigate to="/account/login" />}/> 
            <Route path="/club/create" element={isAuthenticated ? <CreateClub /> : <Navigate to="/account/login" />} />
            <Route path="/account/profile" element={isAuthenticated ? <UserProfile /> : <Navigate to="/account/login" />} />
            <Route path="/account/logout" element={isAuthenticated ? <Logout setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/account/login" />} /> 
            
            {/* Login and Registration Route */}
            <Route path="/account/login" element={!isAuthenticated ? <Login setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/" />} />
            <Route path="/account/register" element={!isAuthenticated ? <Register /> : <Navigate to="/"/>} /> 
          
          </Routes>
        </Router>
  );
}

export default App;
