import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Typography,
  Button,
  Link,
  Stack,
  Paper,
  Card,
  Grid2,
  AppBar,
  Toolbar,
  AlertTitle,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Box,
  useTheme,
  useMediaQuery,
  Drawer,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import {MapContainer, Marker, Popup} from 'react-leaflet'
import { TileLayer } from 'react-leaflet/TileLayer'
import ImageUploadCrop from '../functions/image_crop';
import EventComponent from '../Events/EventComponent/EventComponent';
import { fetchClub, fetchClubEvents, fetchSocials } from '../functions/fetch_functions';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import CloseIcon from '@mui/icons-material/Close';
import SocialIcon from '../Iconizer/SocialIcon';

function ClubPage() {
  const [club, setClub] = useState(null);
  const { clubId } = useParams();
  const navigate = useNavigate();
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [open, setOpen] = useState(false); 
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [activeEvents, setActiveEvents] = useState([]);
  const [completedEvents, setCompletedEvents] = useState([]);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [socials, setSocials] = useState([]);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setImage(null);
  };

  useEffect(() => {    
    if (clubId) {
      fetchClub(clubId, setClub);
      fetchClubEvents({club_id: clubId, setUpcomingEvents: setUpcomingEvents, setActiveEvents: setActiveEvents, setCompletedEvents: setCompletedEvents, setError: setError});
      fetchSocials(clubId, setSocials, setError);
    }
  }, [clubId]);

  const handleOpenAppBar = () => {
    setDrawerOpen(true);
  };

  const handleCloseAppBar = () => {
    setDrawerOpen(false);
  };

  
  const handleLeave = async (club_id) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.delete(
        `http://127.0.0.1:8000/club/member/${club_id}/`,
        {
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        }
      );
      fetchClub(club_id);
      
    } catch (error) {
      console.error('Error leaving:', error);
    }

  };

  const createMemberRequest = async (clubId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        'http://127.0.0.1:8000/club/request/create/',
        { club: clubId },
        {
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        }
      );

      console.log('Member request sent successfully');
      fetchClub(clubId, setClub);
    } catch (error) {
      console.error('Error creating member request:', error);
    }
  };

  const cancelMemberRequest = async (clubId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        'http://127.0.0.1:8000/club/request/cancel/',
        { club: clubId },
        {
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        }
      );
      fetchClub(clubId, setClub);
    } catch (error) {
      console.error('Error deleting member request:', error);
    }
  };

  const handleDelete = async (event) => {
    event.preventDefault();

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.delete(
        `http://127.0.0.1:8000/club/${clubId}/`,
        {
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        }
      );

      console.log('Club deleted');
      navigate('/');
    } catch (error) {
      console.error('Error deleting club: ', error);
    }
  };

  const formData = new FormData();
  const handleImageChange = (e) => {
    setImage(e.target.files[0]); // Set the selected file to the image state
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    formData.append('logo', image);
    const token = localStorage.getItem('access_token');
    const headers = {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'multipart/form-data',
        accept: 'application/json',
    };
    await axios.patch(`http://127.0.0.1:8000/club/${clubId}/logo/`, formData, 
        {headers},
    )
    handleClose();
  };

  if (!club) {
    return <div>Loading...</div>;
  }
  
  return (
    <>
      { isSmallScreen ? (
        <AppBar position="static" color={"primary"}>
          <Toolbar><IconButton onClick={()=>handleOpenAppBar()}><MenuOpenIcon/></IconButton></Toolbar>
          <Drawer
            anchor={"top"}
            open={drawerOpen}
            onClose={()=>handleCloseAppBar()}
            sx={{textAlign:"center", p: 2}}
          >
            {/* Admin Actions */}
            {club.is_club_admin && (
              <>
                <Button
                  color={"common"}
                  onClick={() => navigate('/club/edit/' + clubId)}
                >
                  Edit Club
                </Button>
                <Box sx={{alignContent: "center"}}>
                  <Badge badgeContent={club.member_requests} color="secondary">
                    <Button
                      color={"common"}
                      onClick={() => navigate(`/club/requests/${clubId}`)}
                    >
                      Member Requests
                    </Button>
                  </Badge>
                </Box>
                <Button
                  color={"common"}
                  onClick={() => navigate(`/club/members/${clubId}`)}
                >
                  Members
                </Button>
                <Button
                  color={"common"}
                  onClick={() => navigate(`/club/attendance/${clubId}`)}
                >
                  Attendance
                </Button>
                <Button 
                  onClick={()=>navigate(`/club/events/create/${clubId}`)} 
                  color="common"
                >
                  Create event
                </Button>
                <Button color={"common"} onClick={handleClickOpen}>
                  Update Club Logo
                </Button>
              </>
            )}
            
            {/* Request to join / cancel / leave and member actions */}
            {club.membership_status === 0 && (
              <Button
              color={"common"}
                onClick={() => createMemberRequest(clubId)}
              >
                Request to Join
              </Button>
            )}
            {club.membership_status === 1 && (
              <Button
                color={"common"}
                onClick={() => cancelMemberRequest(clubId)}
              >
                Cancel Request
              </Button>
            )} 
            {club.membership_status === 2 && (
              <>
                <Button 
                  color={"common"}
                  onClick={()=> handleLeave(clubId)}
                >
                  Leave
                </Button>
              </>
            )}  

            {/* President Actions (if not already an admin) */}
            {club.is_club_president && (
              <Button color="error" onClick={handleDelete}>
                Delete Club
              </Button>
            )}
            <Box sx={{alignItems:"center"}}>
              <IconButton onClick={()=>handleCloseAppBar()}><CloseIcon/></IconButton>
            </Box>
          </Drawer>
        </AppBar>
      )
      :
      (
        <AppBar position="static" color={"primary"}>
          <Toolbar>
          
            {/* Admin Actions */}
            {club.is_club_admin && (
                <>
                  <Button
                    color={"common"}
                    onClick={() => navigate('/club/edit/' + clubId)}
                  >
                    Edit Club
                  </Button>
                  <Badge badgeContent={club.member_requests} color="secondary">
                    <Button
                      color={"common"}
                      onClick={() => navigate(`/club/requests/${clubId}`)}
                    >
                      Member Requests
                    </Button>
                  </Badge>
                  <Button
                    color={"common"}
                    onClick={() => navigate(`/club/members/${clubId}`)}
                  >
                    Members
                  </Button>
                  <Button
                    color={"common"}
                    onClick={() => navigate(`/club/attendance/${clubId}`)}
                  >
                    Attendance
                  </Button>
                  <Button 
                    onClick={()=>navigate(`/club/events/create/${clubId}`)} 
                    color="common"
                  >
                    Create event
                  </Button>
                  <Button color={"common"} onClick={handleClickOpen}>
                    Update Club Logo
                  </Button>
                </>
              )}
            
            {/* Request to join / cancel / leave and member actions */}
            {club.membership_status === 0 && (
              <Button
              color={"common"}
                onClick={() => createMemberRequest(clubId)}
              >
                Request to Join
              </Button>
            )}
            {club.membership_status === 1 && (
              <Button
                color={"common"}
                onClick={() => cancelMemberRequest(clubId)}
              >
                Cancel Request
              </Button>
            )} 
            {club.membership_status === 2 && (
              <>
                <Button 
                  color={"common"}
                  onClick={()=> handleLeave(clubId)}
                >
                  Leave
                </Button>
                
              </>
            )}  

            {/* President Actions (if not already an admin) */}
              {club.is_club_president && (
                <Button color="error" onClick={handleDelete}>
                  Delete Club
                </Button>
              )}   
             
          </Toolbar>
        </AppBar>
    )}
    { club.is_club_admin && (!club.sport_type || !club.address) &&
      (
    <Alert severity="warning">
      <AlertTitle>
        Missing information.
      </AlertTitle>
      To help users find your club make sure you add a club sport and add a club address by clicking the buttons at the top of this screen!
    </Alert>
    )}
    <Paper sx={{p:1, height: (club.membership_status === 2) ? "100%": "100vh"}}>
      <Grid2 container spacing={1}>
        <Grid2 item size={{xs: 12, lg: 6}}>
          <Box sx={{p:1}}>

            <Typography variant="h4" gutterBottom>
              {club.name}
            </Typography>

            <Stack spacing={2}>
              <Typography variant="body1">
                Sport: { club.sport_type ? 
                (
                  club.sport_type.name
                )
                :
                (
                  <>
                    No sport
                  </>
                )
                }
                  {club.is_club_admin && (
                    <IconButton
                      color={"common"}
                      onClick={() => navigate(`/club/add-sport/${clubId}`)}
                    >
                    <EditIcon /> 
                    </IconButton>
                  )}
              </Typography>
              <Typography variant="body1">
                President:{' '}
                {club.president ? club.president : 'No president'}
              </Typography>
              <Typography variant="body1">Info: {club.info}</Typography>
                <Typography variant="body1">
                  Created:{' '}
                  {new Date(club.date_created).toLocaleDateString()}
                </Typography>
                <Typography variant="body1">
                  Club location: {club.address}
                  {club.is_club_admin &&(
                    <IconButton
                      color={"common"}
                      onClick={() => navigate(`/club/address/${clubId}`)}
                          
                      >
                    <EditIcon /> 
                    </IconButton>
                  )}
                </Typography>
                
                { socials.socials.length > 0 ? (
                  <>
                  <Typography variant="body1" sx={{fontWeight: 700}}>Socials</Typography>                 
                  <Stack direction="row">
                  
                    {socials.socials.map((social) => (
                        <Tooltip key={social.platform} title={social.url} placement="top">
                          <a key={social.platform} href={social.url}>
                            <IconButton>
                              <SocialIcon platform={social.platform}/>
                            </IconButton>
                          </a>
                        </Tooltip>
                      )
                        
                    )}
                    {club.is_club_admin &&(
                      <IconButton
                        color={"common"}
                        onClick={() => navigate(`/club/add-socials/${clubId}`)}
                            
                        >
                      <EditIcon /> 
                      </IconButton>
                    )}
                  </Stack>
                </>):
                ( 
                club.is_club_admin ? (<Alert severity='warning'>
                  <AlertTitle> This club has no social links.</AlertTitle> 
                  <Button color="warning" onClick={()=> navigate(`/club/add-socials/${clubId}`)}>Add social links.</Button>
        
                </Alert>)
                :
                ( 
                  <>
                  <Typography variant="body1" sx={{fontWeight: 700}}>Socials</Typography>
                  <Typography>This club has no external social medias.</Typography>
                  </>
                ))
                }
            </Stack>
          </Box>
            
          </Grid2>
          <Grid2 size={{xs: 12, lg: 6}}>
            <Box>
              { club && club.coordinates && (
                <MapContainer className="small-map" center={[club.coordinates.lat, club.coordinates.lng]} zoom={13} scrollWheelZoom={false}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[club.coordinates.lat, club.coordinates.lng]}>
                    <Popup>
                      <Typography variant="h6" sx={{mb:-1}}>{club.name}</Typography>
                      {club.sport_type && (<Typography variant="subtitle1" sx={{mb:-1}}>{club.sport_type.name}</Typography>)}
                      <Typography variant="body1">{club.info}</Typography>
                    </Popup>
                  </Marker>
                </MapContainer>
              )}
            </Box>
          </Grid2>

          {/* Dialog for image upload and cropping */}
          <Dialog open={open} onClose={handleClose}>
            <DialogTitle>Update Club Logo</DialogTitle>
            <DialogContent>
              {/*
              <ImageUploadCrop clubId={clubId} handleClose={handleClose} image={image} setImage={setImage} crop={crop} setCrop={setCrop} croppedAreaPixels={croppedAreaPixels} setCroppedAreaPixels={setCroppedAreaPixels} croppedImage={croppedImage} setCroppedImage /> 
              */}
              <form onSubmit={handleSubmit}>
                <input type="file" onChange={handleImageChange} /> {/* Add the input field */}
                <button type="submit">Submit</button> {/* Or your submit mechanism */}
              </form>
              
            </DialogContent>
            <DialogActions>
              <Button color="secondary" variant="contained" onClick={handleClose}>Cancel</Button>
            </DialogActions>
          </Dialog>
      </Grid2>
      { club.membership_status === 2 && (
      <>         
      {/* Only display an Active Events part if there are active events */}
      {activeEvents && activeEvents.length > 0 &&
        (
          <Box sx={{ mt: 1, p: 2, width: '100%', overflow: 'hidden' }}>
            <Typography variant="h6" sx={{fontWeight: 800}}>Active events</Typography>
            <Grid2 container spacing={1}>
              {activeEvents.map( (event) =>
                <EventComponent
                  event = {event}
                />
              )}
            </Grid2>
          </Box>
        )}

      {/* Display an upcoming events, even if there are no upcoming events.*/}
      {(
      <Box sx={{ mt: 1, p: 2, width: '100%', overflow: 'hidden' }}>
      <Typography variant="h6" sx={{fontWeight: 800}}>Upcoming events</Typography>
    
        <Grid2 container spacing={1}>
          {upcomingEvents && upcomingEvents.length > 0 ? 
          (
            upcomingEvents.map( (event) =>
              <>
                <EventComponent
                  event = {event}
                />
              </>
            )
          ) 
            : 
            ( 
              <Grid2 item>
                <Typography variant="h4" sx={{fontWeight: 200}}> No upcoming events.</Typography>
              </Grid2> 
            )}
          
        </Grid2>
      </Box>)}

      {/* Display completed events, even if there are no complete events.*/}
      <Box sx={{ mt: 1, p: 2, width: '100%', overflow: 'hidden' }}>
        <Typography variant="h6" sx={{fontWeight: 800}}>
              Past events
        </Typography>
        <Grid2 container spacing={1}>
          {completedEvents && completedEvents.length > 0 ? 
          (
            completedEvents.map( (event) =>
              <>
                <EventComponent
                  event = {event}
                />
              </>
            )
          ) 
            : 
            (
              <Typography variant="h4" sx={{textAlign:"center", fontWeight: 200}}> No past events.</Typography> 
            )}
          
        </Grid2>
      </Box>
      
      </>)}
    </Paper>
    </>
  );
}

export default ClubPage;