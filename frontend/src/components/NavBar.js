import React from 'react';
import { Link } from 'react-router-dom'; // Import Link
import './Styles/nav.css';

function Navbar(props) {

    const { isAuthenticated } = props;
    return (
        <nav>
        <ul>
            <li>
            <Link to="/">All clubs</Link> 
            </li>
            <li>
            <Link to="/club/create">Create a Club</Link> 
            </li>
            {isAuthenticated ? ( 
                    <><li>
                        <Link to="/account/profile">Account</Link>
                    </li>
                    <li>
                            <Link to="/account/logout">Logout</Link>
                        </li></>
                ) : (
                    <li>
                        <Link to="/account/login">Login</Link>
                    </li>
                )}
        </ul>
        </nav>
    );
}

export default Navbar;