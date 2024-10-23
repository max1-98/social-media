import * as React from 'react';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { mainNavbarItems } from '../consts/NavbarListItems';
import { navbarStyles } from '../consts/styles';
import { Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';

const drawerWidth = 240;

const Navbar = () => {
    const navigate = useNavigate(); 
    return (
        <Drawer
        sx={navbarStyles.drawer}
        variant="permanent"
        anchor="left"
      >
        <Toolbar />
        <Typography sx={navbarStyles.title}>My website</Typography>
        <Divider />
        <List>
        {mainNavbarItems.map((text, index) => (
          <ListItem button key={text.id} disablePadding>
            <ListItemButton component={Link} to={text.route}
              sx={{
                display: 'flex', // This is for better visual appearance 
                alignItems: 'center'
              }}>
              <ListItemIcon sx={navbarStyles.icons}>
                {text.icon}
              </ListItemIcon>
              <ListItemText sx={navbarStyles.text} primary={text.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      </Drawer>
    )
}

export default Navbar