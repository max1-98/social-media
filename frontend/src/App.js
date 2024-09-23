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

function App() {
  
  const token = localStorage.getItem('token');
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);

  useEffect(() => {
    const handleStorageChange = () => {
        const token = localStorage.getItem('token');
        setIsAuthenticated(!!token); // Set isAuthenticated based on the presence of the token
    };

    // Listen for changes to local storage
    window.addEventListener('storage', handleStorageChange);

    // Clean up the listener on unmount
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <Router>
      {isAuthenticated && <Navbar isAuthenticated={isAuthenticated} />}  {/* Show navbar only if logged in */}
        <Routes>
          {/* Redirect to login if not authenticated */}
          <Route path="/" element={isAuthenticated ? <ClubDetail /> : <Navigate to="/account/login" />} /> 
          <Route path="/club/:clubId" element={isAuthenticated ? <ClubPage /> : <Navigate to="/account/login" />} /> 
          <Route path="/club/create" element={isAuthenticated ? <CreateClub /> : <Navigate to="/account/login" />} />
          <Route path="/account/profile" element={isAuthenticated ? <UserProfile /> : <Navigate to="/account/login" />} />
          <Route path="/account/logout" element={isAuthenticated ? <Logout setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/account/login" />} /> 

          {/* Login and Registration Route */}
          <Route path="/account/login" element={!isAuthenticated ? <Login setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/" />} />
          <Route path="/account/register" element={<Register />} /> 
          
          </Routes>
        </Router>
  );
}

export default App;