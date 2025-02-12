// Design imports
import { Tooltip, Typography, useTheme } from "@mui/material";
import {Menu, MenuItem, Sidebar, useProSidebar} from "react-pro-sidebar";
import MenuIcon from '@mui/icons-material/Menu';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Slide from '@mui/material/Slide';



// Icons
import LogoutIcon from '@mui/icons-material/Logout';
import InfoIcon from '@mui/icons-material/Info';
import VerifiedIcon from '@mui/icons-material/Verified';

// Local imports
import { handleLogout, handleRefresh } from "../functions/auth_functions";
import { navitems } from "./navbaritems";

import * as React from 'react';
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function SideNav(props) {
    const theme = useTheme();
    const { collapseSidebar, toggleSidebar, broken} = useProSidebar()
    const location = useLocation();
    const [LogoutDialog, setLogoutDialog] = useState(false);
    const [InfoDialog, setInfoDialog] = useState(false);
    const [error, setError] = useState('');
    const [error_email, setError_email] = useState('');
    const navigate = useNavigate();
    const [userInfo, setUserInfo] = useState({});
    const [sent, setSent] = useState(false);
    const [taskId, setTaskId] = useState({});

    const handleSubmit = async () => {
        if (handleLogout({setIsAuthenticated:props.setIsAuthenticated, setError: setError})){
            handleClose();
            navigate('/account/login');
        }
    };


    const handleCloseInfo = () => {
        setInfoDialog(false);
    };

    const handleClose = () => {
        setLogoutDialog(false);
    };

    const request_verify = async () => {
       

        try {
            const token = localStorage.getItem('access_token');
    
            const headers_post = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                accept: 'application/json',
            };
            
            const response = await axios.post(`http://127.0.0.1:8000/authorization/request_verify/`, 
            {},
            {headers: headers_post}
            );
            setTaskId(response.data);
            console.log(response.data);
        } catch (error) {
            console.error('Error fetching event:', error);
        }
    };

    const fetchNavUserInfo =  async () => {
        try {
            const token = localStorage.getItem('access_token');
            const headers_get =   {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json',
                accept: 'application/json',
            }
            const response = await axios.get(`http://127.0.0.1:8000/account/navbar_info/`, {
            headers: headers_get
        });
            setUserInfo(response.data);
        
        } catch (error) {
            console.error('Error fetching event:', error);
        }
    };

    useEffect(() => {
        if (taskId) {
            
            const WS = new WebSocket(`ws://127.0.0.1:8000/ws/tasks/status/${taskId.task_id}`);

            WS.onmessage = function (event) {
                const res = JSON.parse(event.data);
                const taskStatus = res.state;
          
                if (['SUCCESS', 'FAILURE'].includes(taskStatus)) {
          
                    if (taskStatus === 'SUCCESS') {
                        setSent(true);
                    } else if (taskStatus === 'FAILURE') {
                        setSent(false);
                        setError_email(res.error)
                    }
          
                    WS.close();
                }
            }
        }
    }, [taskId])
    
    useEffect(() => {
        collapseSidebar();
        fetchNavUserInfo();
      }, []);

    return (
        <Sidebar
            style={{
                top: "auto",
                position: 'relative',
            }}
            backgroundColor="theme.palette.primary.main"
        >   
            <Menu
                menuItemStyles={{
                    button: ({active}) => {
                        return {
                            backgroundColor: active ? theme.palette.primary.light : theme.palette.primary.main
                        }
                    }
                }}
            >
                    <MenuItem icon={<MenuIcon/>} onClick={()=>broken ? toggleSidebar() : collapseSidebar()}>
                    </MenuItem>
                { navitems.map(item => (
                    <MenuItem active={location.pathname===item.route} icon={item.icon} component={<Link to={item.route}/>}>
                        <Typography>{item.name}</Typography>
                    </MenuItem>
                ))}
                <MenuItem icon={<InfoIcon/>} onClick={()=>setInfoDialog(true)}>
                    <Typography>Info</Typography>
                </MenuItem>
                { !userInfo.email_verify && (
                    <>
                        {!sent ? ( 
                            error_email ? 
                                (   
                                    <Tooltip title={error_email}>
                                    <MenuItem icon={<VerifiedIcon/>} onClick={()=>request_verify()}>
                                        <Typography sx={{color: "red"}}>Retry</Typography>
                                    </MenuItem>
                                    </Tooltip>
                                )
                                :
                                (
                                    <MenuItem icon={<VerifiedIcon/>} onClick={()=>request_verify()}>
                                        <Typography>Verify email</Typography>
                                    </MenuItem>
                                )
                            )
                            :
                            (
                            <MenuItem icon={<VerifiedIcon/>}>
                                <Typography>Email sent</Typography>
                            </MenuItem>
                        )}
                    </>
                )}
                
                <MenuItem icon={<LogoutIcon />} onClick={()=>setLogoutDialog(true)}>
                    <Typography>Logout</Typography>
                </MenuItem>
            </Menu>
            <Dialog
                open={LogoutDialog}
                TransitionComponent={Transition}
                keepMounted
                onClose={handleClose}
                aria-describedby="alert-dialog-slide-description"
            >
                <DialogTitle>{"Logout"}</DialogTitle>
                <DialogContent>
                <DialogContentText id="alert-dialog-slide-description">
                    Are you sure you want to logout?
                </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button color={"secondary"} variant="outlined" onClick={handleSubmit}>Logout</Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={InfoDialog}
                TransitionComponent={Transition}
                keepMounted
                onClose={handleCloseInfo}

            >
                <DialogTitle>Info</DialogTitle>
                <DialogContent>
                    Go to all clubs to find new clubs to join in your area, you can filter by sport.
                    Click Create a Club to make your own club.
                    You can find clubs nights by click Club Night.
                    Organise your own club's session by clicking "Create Club night".
                </DialogContent>
                <DialogActions>
                    <Button color={"error"} variant="outlined" onClick={handleCloseInfo}>Close</Button>
                </DialogActions>

            </Dialog>
        </Sidebar>
    );
}

export default SideNav;