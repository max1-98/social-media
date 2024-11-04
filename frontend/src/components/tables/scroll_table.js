import { Button, Typography } from '@mui/material';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';

function Member_table(  columns,
                        title, 
                        button_label, 
                        members, 
                        handleButtonClick,
                        page,
                        rowsPerPage,
                        handleChangePage,
                        handleChangeRowsPerPage,
                        setMembers, 
                        setEvent, 
                        setAMembers, 
                        setInGameMembers,
                        event_id,
                    ) 
    {
return (
    <Paper sx={{ width: '100%', overflow: 'hidden'}} elevation={4}>

        <Typography variant="h6" sx={{textAlign:"center", fontWeight:600}}>{title}</Typography>

        <TableContainer sx={{ maxHeight: "100%" }}>
            <Table stickyHeader aria-label="sticky table">
                <TableHead>
                    <TableRow>
                        {columns.map((column) => (
                        <TableCell
                            key={column.id}
                            align={column.align}
                            style={{ minWidth: column.minWidth }}
                            sx={{bgcolor: "neutral.light"}}
                        >
                            {column.label}
                        </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {members
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((member) => (
                        <TableRow hover role="checkbox" tabIndex={-1} key={member.id}> 
                            <>
                                <TableCell key={`name-${member.id}`}>
                                    {member.first_name} {member.surname}
                                </TableCell>
                                <TableCell key={`username-${member.id}`}>
                                    {member.username}
                                </TableCell>
                                <TableCell key={`elo-${member.id}`}>
                                    {member.elo ? member.elo : 'Unranked'}
                                </TableCell>
                            </>
                            <TableCell key="link" align="center"> 
                            
                                <Button variant="outlined" color="error" onClick={() => handleButtonClick(member.id, event_id, setMembers, setEvent, setAMembers, setInGameMembers)}>{button_label}</Button>
                            </TableCell> 
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
        <TablePagination
            rowsPerPageOptions={[10, 25, 100]}
            component="div"
            count={members.length} // Update count for active members
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            />
    </Paper>
)};

export default Member_table;