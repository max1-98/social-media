import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, InputLabel, MenuItem, Select } from "@mui/material";


function EventSettingsDialog(props) {
    const { open, onClose, eventSettings, handleUpdateEventSettings, setEventSettings, eventId } = props;
    
  
    const handleChangeSbmm = (event) => {
        // Update the sbmm value in eventSettings
        setEventSettings({ ...eventSettings, sbmm: event.target.checked });
      };
    
      const handleChangeMode = (event) => {
        // Update the mode value in eventSettings
        setEventSettings({ ...eventSettings, mode: event.target.value });
      };
    
      const handleChangeEvenTeams = (event) => {
        // Update the evenTeams value in eventSettings
        setEventSettings({ ...eventSettings, evenTeams: event.target.checked });
      };

    const handleSubmit = async (event) => {
        event.preventDefault();
        await handleUpdateEventSettings(eventId, eventSettings); 
        console.log(eventSettings)
        onClose();
    };
  
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>Event Settings</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <FormControlLabel
              control={<Checkbox checked={eventSettings.sbmm} onChange={handleChangeSbmm} />}
              label="Update Elo"
            />
            <FormControl>
              <InputLabel id="mode-select-label">Mode</InputLabel>
              <Select
                labelId="mode-select-label"
                id="mode-select"
                value={eventSettings.mode}
                onChange={handleChangeMode}
              >
                <MenuItem value="sbmm">SBMM</MenuItem>
                <MenuItem value="social">Social</MenuItem>
                <MenuItem value="peg_board">Peg Board</MenuItem>
              </Select>
            </FormControl>
            { (eventSettings.mode == "social") && (
            <FormControlLabel
              control={<Checkbox checked={eventSettings.evenTeams} onChange={handleChangeEvenTeams} />}
              label="Even Teams"
            />
            )}
            <DialogActions>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="contained">Save</Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

export default EventSettingsDialog;