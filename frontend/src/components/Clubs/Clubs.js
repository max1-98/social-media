import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Grid2,
  Box,
  AppBar,
  Paper,
  Card,
  Chip,
  Avatar,
  Stack,
  Alert,
  Button,
  Tabs,
  Tab,
  useMediaQuery,
  Drawer,
  IconButton,
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles'
import {CircleMarker, MapContainer, Marker, Popup} from 'react-leaflet'
import { TileLayer } from 'react-leaflet/TileLayer'
import SportIcon from '../Iconizer/SportIcon';
import LocateUser from '../functions/locate_user';
import { fetchClubs, fetchSports } from '../functions/fetch_functions';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import CloseIcon from '@mui/icons-material/Close';

const StyledTab = styled(Tab)(({ theme, selected }) => ({
  backgroundColor: selected ? theme.palette.text.primary : 'transparent',
  color: selected ? "transparent" : theme.palette.text.primary,
  '&:hover': {
    opacity: 0.7 //Reduce opacity on hover
  }
}));

function ClubDetail() {
  const [clubs, setClubs] = useState([]);
  const navigate = useNavigate();
  const [mapCenter, setMapCenter] = useState([54.257651, -2.681402]);
  const [mapLoading, setMapLoading] = useState(true); 
  const [zoom, setZoom] = useState(6);
  const [userLoc, setUserLoc] = useState(null);
  const [ alertInfo, setAlertinfo] = useState(true);
  const mapRef = useRef(null);
  const [ne, setNE] = useState(null);
  const [sw, setSW] = useState(null);
  const [sport, setSport] = useState("");
  const [sports, setSports] = useState([]);
  const [value, setValue] = useState(0);
  const [CoordUrl, setCoordUrl] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState('');
  const [ DrawerOpen, setDrawerOpen] = useState(false);
  

  // Styling
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  function stringToColor(string) {
    let hash = 0;
    let i;
  
    /* eslint-disable no-bitwise */
    for (i = 0; i < string.length; i += 1) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
  
    let color = '#';
  
    for (i = 0; i < 3; i += 1) {
      const value = (hash >> (i * 8)) & 0xff;
      color += `00${value.toString(16)}`.slice(-2);
    }
    /* eslint-enable no-bitwise */
  
    return color;
  }
  
  function stringAvatar(name) {
    return {
      sx: {
        bgcolor: stringToColor(name),
      },
      children: `${name.split(' ')[0][0]}${name.split(' ')[1][0]}`,
    };
  }
  
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleMoveEnd = (e) => {
    const bounds = e.target.getBounds();
    setNE(prevNE => bounds._northEast); //Functional update for NE
    setSW(prevSW => bounds._southWest); //Functional update for SW
  };
  
  const handleMapReady = useCallback(() => {
    if (!mapReady) {
    setMapReady(true);
    }
  }, []);



  // Fetches clubs if the ne coordinate or sw coordinate changes
  useEffect(() => {
    fetchClubs({ne: ne, sw: sw, sport: sport, setClubs: setClubs, setError: setError, setCoordUrl: setCoordUrl, CoordUrl: CoordUrl});
  }, [ne, sw]);

  // Waits for map to be ready and then rurn the map move/zoom watcher on
  useEffect(() => {
    if (mapReady){
      const bounds = mapRef.current.getBounds();
      setNE(prevNE => bounds._northEast); //Functional update for NE
      setSW(prevSW => bounds._southWest);
      mapRef.current.on('moveend', handleMoveEnd);
      mapRef.current.on('zoom', handleMoveEnd);
    }
    
  }, [mapReady]);

  // Fetches clubs if the sport changes
  useEffect(() => {
    fetchClubs({ne: ne, sw: sw, sport: sport, setClubs: setClubs, setError: setError, setCoordUrl: setCoordUrl, CoordUrl: CoordUrl});
  }, [sport]);

  useEffect(() => {
    fetchSports({setSports: setSports, setError: setError});

    const userLocation = sessionStorage.getItem('userLocation');
    if (userLocation) {
      setMapCenter(JSON.parse(userLocation));
      setUserLoc(JSON.parse(userLocation));
      setMapLoading(false)
      setZoom(10)
    }
    else {
      setMapLoading(false)
    }

  }, []);

  return (
    <>
      <Grid2 container sx={{ mr:-3}}>

        {/* Map container */}
        <Grid2 item size={12}>

          {/* Tabs */}
          <Box sx={{ width: '100%' }}>
            <AppBar position="static" color={"primary"}>
              <Tabs
                value={value}
                onChange={handleChange}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile 
                aria-label="scrollable sports tabs"
              >  
                <Box 
                  onClick={()=> setDrawerOpen(true)} 
                  sx={{
                    p:2,
                    textAlign: "center",
                    '&:hover': {
                        backgroundColor: "primary.light",
                        cursor: 'pointer',
                        color: 'secondary.main'
                    }
                  }} 
                >
                  <FormatListBulletedIcon/>
                  <Typography variant="subtitle2" sx={{fontWeight: 500}}>CLUB LIST</Typography>
                </Box>
                <StyledTab key={1} label={"No filter"} icon={<FilterAltOffIcon/>} onClick={()=> setSport("")} selected={value === 0}/>
                {sports.map((sport, index) => (
                  <StyledTab key={index} label={sport.name} icon={<SportIcon sport={sport.name} selected={value === index+1}/>} onClick={()=> setSport(sport.name)} />
                ))}
              </Tabs>
            </AppBar>
          </Box>

          {/* Map */}
          <MapContainer ref={(map) => {mapRef.current = map; if (map) handleMapReady();}} className={"big-map2"} center={mapCenter} zoom={zoom} scrollWheelZoom={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocateUser/>
            { userLoc && (
              <CircleMarker
                center={userLoc}
                radius={8}
                fillColor="green"
                fillOpacity={0.7}
                color="green"
                stroke={true}
                weight={2}
              >
                <Popup>Your Location</Popup>
              </CircleMarker>
              )}
            {clubs.map((club,index) => (
              club.coordinates && (
                <Marker position={[club.coordinates.lat, club.coordinates.lng]}>
                  <Popup>
                    <Box onClick={()=>navigate(`/club/${club.id}`)}>
                      <Typography variant="h6" sx={{mb:-1}}>{club.name}</Typography>
                      {club.sport_type && (<Typography variant="subtitle1" sx={{mb:-1}}>{club.sport_type.name} club</Typography>)}
                      <Typography variant="body2">{club.info}</Typography>
                    </Box>
                  </Popup>

                </Marker>
              )
            ))}
          </MapContainer>
        </Grid2>
        {/* List of clubs container */}
        <Drawer
          anchor={"right"}
          open={DrawerOpen}
          onClose={()=> setDrawerOpen(false)}
        >
          <Paper sx={{height: "100vh", p:-1}}>
            
            <Stack direction={"column"} sx={{maxHeight: '100%', overflow: 'auto'}} spacing={1}>
              <Box sx={{alignItems:"left"}}>
              <IconButton onClick={()=> setDrawerOpen(false)}><CloseIcon/></IconButton>
              </Box>
              { alertInfo && (
              <>
              <Alert sx={{width: "100%"}} severity="info">
              "Upcmg Evts" is short for "upcoming events", if the Chip is green then this club has upcoming events.
              <br/>
              "Avg. Att." is short for "average attendance", this finds the average attendance for that clubs events in the last 4 weeks.
              <br/>
              <Button color={"common"} variant="outlined" onClick={()=>setAlertinfo(false)}>Dismiss</Button>
              </Alert>
              </>
              )}
            
              {clubs.map((club,index) => (
                <Box>
                  <Card onClick={()=>navigate(`/club/${club.id}`)} sx={{p:1, width: "100%", height:150}}>
                    <Grid2 container>
                      <Grid2 item size={3}>
                        <Stack spacing={1} sx={{alignItems:"center", textAlign:"center", justifyContent:"center"}}>
                          { club.logo ? <Avatar sx={{height: 50, width: 50}}  alt="profile picture" src={"http://127.0.0.1:8000/"+club.logo} />
                          :
                          <Avatar sx={{height: 50, width: 50}} {...stringAvatar(club.name)} />
                          }
                        
                        <Typography sx={{fontSize: 10}}>@{club.club_username}</Typography>
                        </Stack>
                      </Grid2>
                      <Grid2 item size={9}>
                        <Box sx={{height: 90, width: "100%"}}>
                          <Typography variant={"subtitle2"}>{club.name}</Typography>
                          <Typography variant={"body2"}>{club.info}</Typography>
                        </Box>
                      </Grid2>
                    </Grid2>
                    <Grid2 container>
                      <Grid2 item size={3} sx={{textAlign:"center"}}>
                        
                        {club.sport_type ? (<SportIcon sport={club.sport_type.name}/>): <Typography>No sport type</Typography>}
                      </Grid2>
                      <Grid2 item size={9}>
                        <Stack direction="row" spacing={1}>
                        <Chip
                          size={"medium"}
                          label={club.is_active ? "Active" : "Inactive"}
                          variant="outlined"
                          color={club.is_active ? "success" : "error"}
                        />
                        <Chip 
                          size={"medium"}
                          label={club.is_event_upcoming ? "Upcmg Evts" : "No events"}
                          variant="outlined"
                          color={club.is_event_upcoming ? "success" : "error"}
                        />
                        { club.average_attendance === "New!" ?  (
                          <Chip
                            size={"medium"}
                            label={`${club.average_attendance}`}
                            variant="outlined"
                            color={"secondary"}
                          />)
                          :
                          <Chip
                            size={"medium"}
                            label={`Avg. Att. ${Math.ceil(club.average_attendance)}`}
                            variant="outlined"
                            color={"secondary"}
                          />}
                        </Stack>
                        
                      </Grid2>
                    
                    </Grid2>
                  </Card>
                </Box>
              )
            )}
            </Stack>
          </Paper>
        </Drawer>

      </Grid2>
    </>
    
  );
}

export default ClubDetail;
