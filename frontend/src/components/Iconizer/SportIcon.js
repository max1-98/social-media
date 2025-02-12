import { Box, Card, Chip, Grid2, Typography } from "@mui/material"
import { Link, useNavigate } from "react-router-dom"
import { BadmintonIcon } from "./sport icons/BadmintonIcon";
import { CIcon } from '@coreui/icons-react';
import * as icon from '@coreui/icons';
import { TennisIcon } from "./sport icons/TennisIcon";
import { BasketballIcon } from "./sport icons/BasketballIcon";
import { VolleyballIcon } from "./sport icons/VolleyballIcon";
import { PadelIcon } from "./sport icons/PadelIcon";
import { FootballIcon } from "./sport icons/FootballIcon";
import { HockeyIcon } from "./sport icons/HockeyIcon";
import { RugbyIcon } from "./sport icons/RugbyIcon";
import { PoolIcon } from "./sport icons/PoolIcon";

function SportIcon(props){

    const {sport} = props
    
    return (
        <>
            {sport === "badminton" &&
                (
                <BadmintonIcon/>
                )
            }
            {sport ==="basketball" &&
                (
                    <BasketballIcon/>
                )   
            }
            {sport ==="football" &&
                (
                    <FootballIcon/>
                )   
            }
            {sport ==="hockey" &&
                (
                    <HockeyIcon/>
                )   
            }
            {sport ==="padel" &&
                (
                    <PadelIcon/>
                )   
            }
            {sport ==="rugby" &&
                (
                    <RugbyIcon/>
                )   
            }
            {sport === "tennis" &&
                (
                <TennisIcon/>
                )
            }
            
            {sport ==="volleyball" &&
                (
                    <VolleyballIcon/>
                )   
            }
            { sport==="pool" &&
                (
                    <PoolIcon/>
                )
            }
            {sport === "snooker" &&
                (
                <PoolIcon/>
                )
            }
        </>
        
    )
};

export default SportIcon;