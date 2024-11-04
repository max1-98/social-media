import {  fetchEvent, fetchGames} from "../../functions/fetch_functions";
import { handleActivate, handleDeactivate } from "../../functions/handles_functions";

import { Button, Grid2, AppBar, Toolbar, Paper} from '@mui/material';
import { membercolumns } from '../consts/columns';
import axios from "axios";
import Member_table from "../../tables/scroll_table";
import EventSettingsDialog from "./functions/EventsSettingsDialog";
import DummyMemberCreateDialog from "./functions/DummyMemberCreateDialog";
import GameDisplay from "./functions/GameDisplay";
import SelectTeamDialog from "./functions/PegCreateGame";

function ActiveEvent(
        event, 
        club, 
        games, 
        members, 
        amembers, 
        in_game_members, 
        setEvent, 
        setAMembers, 
        setInGameMembers, 
        setMembers, 
        setGames, 
        team1Score, 
        setTeam1Score,
        team2Score,
        setTeam2Score,
        open, 
        setOpen,
        memberInfo,
        setMemberInfo,
        error, 
        setError,
        page, 
        setPage,
        page1, 
        setPage1,
        rowsPerPage, 
        setRowsPerPage,
        openSettingsDialog, 
        setOpenSettingsDialog,
        eventSettings,
        setEventSettings,
        openPegDialog, 
        setOpenPegDialog,
        selectedMembers, 
        setSelectedMembers, 
        player1Id, 
        setplayer1Id
    ) {
    
      
    const handleUpdateEventSettings = async (event_id, data) => {
      try {
        console.log(data)
        const token = localStorage.getItem('access_token');
        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          accept: 'application/json',
        };
    
        const response = await axios.put(
          `http://127.0.0.1:8000/club/event/settings/${event_id}/`, 
          {
            sbmm: data.sbmm,
            mode: data.mode,
            even_teams: data.evenTeams,
          }, 
          { headers }
        );
        
        fetchEvent(event_id, setEvent, setAMembers, setInGameMembers);
        handleCloseSettingsDialog();
      } catch (error) {
        setError(error.response.data.detail || 'Error changing mode.');
        console.error('Error changing mode:', error);
      }
    };

    const handleClosePegDialog = () => {
      setOpenPegDialog(false);
      setSelectedMembers([]);
    };
    const handleCloseSettingsDialog = () => {
      setOpenSettingsDialog(false);
    };
    
    const handlePegStart = async (event_id) => {
      try { 
        const token = localStorage.getItem('access_token');

        const headers_post = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
        }
        const response = await axios.post(`http://127.0.0.1:8000/game/get-player_1/`, 
          {
              event_id: event_id,
          },
          {headers: headers_post}
        );
          setplayer1Id(response.data);
          setSelectedMembers([]);
          console.log(selectedMembers)
          setOpenPegDialog(true);
          
      } catch (error) {
        console.error('Error fetching event:', error);
      }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangePage1 = (event, newPage) => {
        setPage1(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };   

    const handleCreateSBMMGame = async(event_id) => {
        try {
          const token = localStorage.getItem('access_token');
          const headers = {
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json',
              accept: 'application/json',
          }
          const response = await axios.post(`http://127.0.0.1:8000/game/create-sbmm/`, 
          {
              event_id: event_id,
          },
          {headers}
        );
        fetchGames(event_id, setGames);
        fetchEvent(event_id, setEvent, setAMembers, setInGameMembers);
        } catch (error) {
          console.error('Error fetching event:', error);
        }
    };

    const handleCreateSocialGame = async(event_id) => {
      try {
        
        const token = localStorage.getItem('access_token');
        const headers = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
        }
        const response = await axios.post(`http://127.0.0.1:8000/game/create-social/`, 
        {
            event_id: event_id,
        },
        {headers}
      );

      fetchGames(event_id, setGames);
      fetchEvent(event_id, setEvent, setAMembers, setInGameMembers);
      } catch (error) {
        console.error('Error fetching event:', error);
      }
    };

    const handleComplete = async(event_id) => {
    
        try {
          const token = localStorage.getItem('access_token');
          const headers = {
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json',
              accept: 'application/json',
          }
          const response = await axios.post(`http://127.0.0.1:8000/club/event/complete/`, 
          {
              event_id: event_id,
          },
          {headers}
        );
        fetchEvent(event_id, setEvent, setAMembers, setInGameMembers);
        } catch (error) {
          console.error('Error fetching event:', error);
        }
    };

return (
    <>
    
      { club.is_club_admin && (
        <AppBar position="static" color={"primary"}>
          <Toolbar>
            <Button onClick={() => handleComplete(event.id)} color={"common"}>Complete event</Button>
        

            {/* Create game button */}
            { event.mode === 'sbmm' && (
              <Button onClick={() => handleCreateSBMMGame(event.id)}  color={"common"}>Create game</Button>
            )}
            { event.mode === 'social' && (
              <Button onClick={() => handleCreateSocialGame(event.id)} color={"common"}> Create game</Button>
            )}
            {
              event.mode === 'peg_board' && (
                <>
                  <Button onClick={()=>handlePegStart(event.id)} color={"common"}>Create Game</Button>
                  <SelectTeamDialog 
                    open={openPegDialog}
                    handleClose={handleClosePegDialog}
                    player1Id={player1Id}
                    activeMembers={amembers}
                    selectedMembers={selectedMembers}
                    setSelectedMembers={setSelectedMembers}
                    setGames={setGames}
                    setEvent={setEvent} 
                    setAMembers={setAMembers} 
                    setInGameMembers={setInGameMembers} 
                    event={event}
                    />
                </>
            )}
        
            {/* Create Member Dialog and Button */}
          
            <DummyMemberCreateDialog
              open={open}
              setOpen={setOpen}
              memberInfo={memberInfo}
              setMemberInfo={setMemberInfo}
              error={error}
              setError={setError}
              is_club_admin={club.is_club_admin}
              eventId={event.id}
              setMembers={setMembers}
              clubId={club.id}
            />

            {/* Change mode Dialog and Button */}
            <Button onClick={() => setOpenSettingsDialog(true)} color={"common"}>Mode</Button>
            <EventSettingsDialog
                open={openSettingsDialog}
                onClose={handleCloseSettingsDialog}
                eventSettings={eventSettings}
                setEventSettings={setEventSettings}
                handleUpdateEventSettings={handleUpdateEventSettings}
                eventId={event.id}
            />
          </Toolbar>
        </AppBar>
      )}

      {/* Games */}
      <Paper sx={{p:1}}>
        <Grid2 container spacing={1} justifyContent="center">
          {games.map((game) => (
            <GameDisplay 
              game={game} 
              setGames={setGames}
              event={event}
              club={club}
              setEvent={setEvent} 
              setMembers={setMembers}
              setAMembers={setAMembers}
              setInGameMembers={setInGameMembers}
              team1Score={team1Score}
              team2Score={team2Score}
              setTeam1Score={setTeam1Score} 
              setTeam2Score={setTeam2Score}
            />
          ))}
      </Grid2>
    
      <Grid2 container spacing={1}>
      {club.is_club_admin && (
        <> 
          {/* Active Member Table (excl. in game active members) */}
            <Grid2 item size={{ xs: 12, lg: 6 }}>
              {Member_table(
                membercolumns,
                'Active Members',
                'Deactivate',
                members.filter(member => 
                    amembers.some(amember => amember.id === member.id) 
                ),
                handleDeactivate,
                page,
                rowsPerPage,
                handleChangePage, 
                handleChangeRowsPerPage,
                setMembers, 
                setEvent, 
                setAMembers, 
                setInGameMembers,
                event.id,
              )}
            </Grid2>

          {/* Table for Remaining Members (excl. in game active members)*/}
            <Grid2 item size={{ xs: 12, lg: 6 }}>
              {Member_table(
                membercolumns,
                'Inactive Members',
                'Activate',
                members.filter(member => 
                    !amembers.some(amember => amember.id === member.id) && 
                    !in_game_members.some(gameMember => gameMember.id === member.id) 
                ),
                handleActivate,
                page1,
                rowsPerPage,
                handleChangePage1, 
                handleChangeRowsPerPage,
                setMembers, 
                setEvent, 
                setAMembers, 
                setInGameMembers,
                event.id,
              )}
            </Grid2>
          </>
        )}
        </Grid2>
      </Paper>
    </>)};

export default ActiveEvent;