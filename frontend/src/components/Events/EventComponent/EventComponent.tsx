import { Avatar, Box, Card, Chip, Grid2, Typography, useTheme } from "@mui/material"
import { useNavigate } from "react-router-dom"
import { format } from 'date-fns';
import type { Event } from "../../../types";

interface EventComponentProps {
    event: Event;
}

function EventComponent(props: EventComponentProps){
    const navigate = useNavigate();
    const {event} = props
    const SBMMColor = event.sbmm ? "success" : "error"
    const GAColor = event.guests_allowed ? "success" : "error"
    const theme = useTheme();
    const formattedDate = format(new Date(event.date), 'dd/MM/yyyy');
    const formattedStartTime = format(new Date(`2000-01-01T${event.start_time}Z`), 'HH:mm');
    const formattedFinishTime = format(new Date(`2000-01-01T${event.finish_time}Z`), 'HH:mm');

    function stringToColor(string: string) {
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

      function stringAvatar(name: string) {
        return {
          sx: {
            bgcolor: stringToColor(name),
          },
          children: `${name.split(' ')[0][0]}${name.split(' ')[1][0]}`,
        };
      }

    return (
        <Grid2 size={{xs:12, md:6, lg: 4}} sx={{p:1}}>
            <Card sx={{p: 2, backgroundColor: (theme.palette as any).userprofile.card, color: (theme.palette as any).userprofile.cardContrastText}}>
                <Grid2 container spacing={2}>
                    <Grid2 size={3}>
                        { event.club.logo ? <Avatar sx={{height: 50, width: 50}}  alt="profile picture" src={event.club.logo} />
                          :
                          <Avatar sx={{height: 50, width: 50}} {...stringAvatar(event.club.name)} />
                        }
                    </Grid2>
                    <Grid2 size={9}>
                        <Typography variant={"h6"} sx={{fontWeight: 700}}>{event.club.name}</Typography>
                        <Typography variant={"body2"} sx={{fontWeight: 300}}><i>- {event.game_type.name} -</i></Typography>
                        <Typography variant={"body2"} sx={{fontWeight: 300}}><i>- {formattedDate} <span>&#8226;</span> {formattedStartTime}-{formattedFinishTime} -</i></Typography>
                    </Grid2>
                    <Grid2>
                        <Chip
                            size={"medium"}
                            color={SBMMColor}
                            label={`SBMM`}
                            variant="outlined"
                            sx={{
                                padding: '0',
                                margin: '0',
                                '& .MuiChip-deleteIcon': {
                                    marginLeft: 'auto',
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
                                    marginLeft: 'auto',
                                }
                            }}
                        />
                        <Chip
                            size={"medium"}
                            color={"common" as any}
                            label={"Go to event"}
                            variant="outlined"
                            onClick={() => navigate(`/club/event/${event.club.id}/${event.id}`)}
                        />
                    </Grid2>
                </Grid2>
            </Card>
        </Grid2>
    )
};

export default EventComponent;
