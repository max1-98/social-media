import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import { useState } from 'react';


function Member_table(  columns,
                        title, 
                        button_label, 
                        members, 
                        handleButtonClick,
                        page,
                        rowsPerPage,
                        handleChangePage,
                        handleChangeRowsPerPage
                    ) 
    {
return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>

        <h2>{title}</h2>
        <TableContainer sx={{ maxHeight: 220 }}>
            <Table stickyHeader aria-label="sticky table">
                <TableHead>
                    <TableRow>
                        {columns.map((column) => (
                        <TableCell
                            key={column.id}
                            align={column.align}
                            style={{ minWidth: column.minWidth }}
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
                            </>
                            <TableCell key="link" align="center"> 
                                <button onClick={() => handleButtonClick(member.id)}>{button_label}</button>
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