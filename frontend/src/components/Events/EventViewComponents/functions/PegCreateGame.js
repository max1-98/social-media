
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
} from '@mui/material';
import axios from 'axios';
import { fetchEvent, fetchGames } from '../../../functions/fetch_functions';

function SelectTeamDialog({ open, handleClose, player1Id, activeMembers, selectedMembers, setSelectedMembers, setGames, setEvent, setAMembers, setInGameMembers, event }) {

  const handleMemberCheckboxChange = (event, memberId) => {
    const isChecked = event.target.checked;

    if (isChecked) {
      setSelectedMembers([...selectedMembers, memberId]);
    } else {
      setSelectedMembers(selectedMembers.filter((id) => id !== memberId));
    }
  };
  
  const onTeamSelect = async (event_id, selectedMembers, player1) => {
    try {
        selectedMembers.push(player1.id)
        const token = localStorage.getItem('access_token');
        const headers = {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            accept: 'application/json',
        }
        const response = await axios.post(`http://127.0.0.1:8000/game/create-peg/`, 
        {
            event_id: event_id,
            member_ids: selectedMembers,
        },
        {headers}
      );
        fetchGames(event_id, setGames);
        fetchEvent(event_id, setEvent, setAMembers, setInGameMembers);
        setSelectedMembers([]);
      } catch (error) {
        console.error('Error fetching event:', error);
        setSelectedMembers([]);
      }
  };

  const handleTeamSelect = (event_id, selectedMembers, player1Id) => {
    if (selectedMembers.length === 3) {
      onTeamSelect(event_id, selectedMembers, player1Id);
      handleClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Select Team Members</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Player 1: {player1Id.username}
        </DialogContentText>
        <List>
          {activeMembers.filter(member => member.id !== player1Id.id).map((member) => (
            <ListItem key={member.id}>
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={selectedMembers.includes(member.id)}
                  onChange={(e) => handleMemberCheckboxChange(e, member.id)}
                />
              </ListItemIcon>
              <ListItemText primary={`${member.first_name} ${member.surname}`}/>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button color={"error"} onClick={handleClose}>Cancel</Button>
        <Button color={"success"} disabled={selectedMembers.length !== 3} onClick={()=>handleTeamSelect(event.id, selectedMembers, player1Id)}>Select Team</Button> 
      </DialogActions>
    </Dialog>
  );
}

export default SelectTeamDialog;