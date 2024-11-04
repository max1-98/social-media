import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, TextField } from "@mui/material";
import { fetchMembers } from "../../../functions/fetch_functions";
import axios from "axios";

function DummyMemberCreateDialog(props) {

    const { open, setOpen, memberInfo, setMemberInfo, error, setError, is_club_admin, eventId, setMembers, clubId} = props;
    
      
      const handleClickOpen = () => {
        setOpen(true);
      };
      
      const handleClose = () => {
        setOpen(false);
        setMemberInfo({ ...memberInfo, firstName: ''});
        setMemberInfo({ ...memberInfo, surname: ''});
        setError(null); // Clear error after dialog is closed
      };
      
      const handleChangeFirstName = (event) => {
        setMemberInfo({ ...memberInfo, firstName: event.target.value});
      };
      
      const handleChangeSurname = (event) => {
        setMemberInfo({ ...memberInfo, surname: event.target.value});
      };

      const handleChangeGender = (event) => {
        setMemberInfo({ ...memberInfo, gender: event.target.value });
      };

      const handleCreateMember = async () => {
        try {
          const token = localStorage.getItem('access_token');
          const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            accept: 'application/json',
          };
      
          const response = await axios.post(
            `http://127.0.0.1:8000/club/dummy-user/create/${clubId}/`, 
            {
              first_name: memberInfo.firstName,
              surname: memberInfo.surname,
              biological_gender: memberInfo.gender
            }, 
            { headers }
          );
          
          if (is_club_admin){
            fetchMembers(eventId, setMembers);
          }
          handleClose(); // Close the dialog
        } catch (error) {
          setError(error.response.data.detail || 'Error creating dummy user.');
          console.error('Error creating dummy user:', error);
        }
      };

    return (
        <>
            <Button onClick={handleClickOpen} color={"common"}>
            Create Member
            </Button>
            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>Create New Member</DialogTitle>
                <DialogContent>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                    autoFocus
                    margin="dense"
                    id="first_name"
                    label="First Name"
                    fullWidth
                    value={memberInfo.firstName}
                    onChange={handleChangeFirstName}
                />
                <TextField
                    margin="dense"
                    id="surname"
                    label="Surname"
                    fullWidth
                    value={memberInfo.surname}
                    onChange={handleChangeSurname}
                />

                <FormControl component="fieldset" margin="dense" fullWidth>
                <FormLabel component="legend">Biological Gender</FormLabel>
                <RadioGroup
                aria-label="gender"
                name="gender"
                value={memberInfo.gender}
                onChange={handleChangeGender}
                >
                <FormControlLabel 
                    value="male" 
                    control={<Radio />} 
                    label="Male" 
                />
                <FormControlLabel 
                    value="female" 
                    control={<Radio />} 
                    label="Female" 
                />
                </RadioGroup>
                </FormControl>
                </DialogContent>
                <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button onClick={handleCreateMember}>Create</Button>
                </DialogActions>
            </Dialog>
        </>
    )
};

export default DummyMemberCreateDialog;