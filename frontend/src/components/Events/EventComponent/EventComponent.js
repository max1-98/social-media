import { Box, Card, Chip, Grid2, Typography } from "@mui/material"
import { Link, useNavigate } from "react-router-dom"
function EventComponent(props){
    const navigate = useNavigate();
    const {event} = props
    const SBMMColor = event.sbmm ? "success" : "error"
    const GAColor = event.guests_allowed ? "success" : "error"
    return (
        <Grid2 item size={4}>
            <Card variant="outlined" sx={{padding: 1}}>
                <Typography variant={"h6"} sx={{fontweight: 600}}>{event.club_name}</Typography>
                <Typography variant={"body2"}>{event.sport}</Typography>
                <Typography variant={"body2"}>Date: {event.date}</Typography>
                <Typography variant={"body2"}> {event.start_time}-{event.finish_time}</Typography>
                <Chip
                    size={"medium"}
                    color={SBMMColor}
                    label={`SBMM`} 
                    variant="outlined" 
                    sx={{
                        padding: '0', 
                        margin: '0', 
                        '& .MuiChip-deleteIcon': { 
                            marginLeft: 'auto', // Move delete icon to the right
                        }
                    }}
                />
                <Chip
                    size={"medium"}
                    color={GAColor}
                    label={`Guests allowed`} 
                    variant="outlined" 
                    sx={{
                        padding: '0', 
                        margin: '0', 
                        '& .MuiChip-deleteIcon': { 
                            marginLeft: 'auto', // Move delete icon to the right
                        }
                    }}
                />
                <Chip 
                    size={"medium"}
                    color={"common"}
                    label={"Go to event"}
                    variant="outlined"
                    onClick={() => navigate(`/club/event/${event.club_id}/${event.id}`)}
                />
            </Card>
        </Grid2>
    )
};

export default EventComponent;