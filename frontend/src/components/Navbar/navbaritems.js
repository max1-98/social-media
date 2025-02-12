
import GroupsIcon from '@mui/icons-material/Groups';
import AddBoxIcon from '@mui/icons-material/AddBox';
import CasinoIcon from '@mui/icons-material/Casino';
import Person2Icon from '@mui/icons-material/Person2';
import WorkspacesIcon from '@mui/icons-material/Workspaces';

export const navitems = [
    {
        id: 0, 
        name: "Profile",
        route: "/account/profile",
        icon: <Person2Icon/>,
    },
    {
        id: 1, 
        name: "All clubs",
        route: "/",
        icon: <GroupsIcon />,
    },
    {
        id: 2, 
        name: "Create club",
        route: "/club/create",
        icon:  <AddBoxIcon />,
    },

    {
        id: 3, 
        name: "Past games",
        route: "/account/past-games",
        icon: <CasinoIcon />,
    },
    {
        id: 4,
        name: "Club nights",
        route: "",
        icon: <WorkspacesIcon/>,
    },
    {
        id: 5,
        name: "Create club night",
        route: "",
        icon: <AddBoxIcon/>,
    },
]
    