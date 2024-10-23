import { Button, Typography } from '@mui/material';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';

function Game_table(  columns,
                        games, 
                        page,
                        rowsPerPage,
                        handleChangePage,
                        handleChangeRowsPerPage,
                    ) 
    {
return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Typography variant="h5" sx={{ marginLeft: '10px', mt: '4px'}}>Games</Typography>
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
                    {games
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((game) => (
                        <TableRow hover role="checkbox" tabIndex={-1} key={game.id}> 
                            <>  
                                <TableCell key={`start_time-${game.id}`}>
                                    {new Date(game.start_time).getHours() + ':' + new Date(game.start_time).getMinutes()}
                                </TableCell>
                                <TableCell key={`team1-${game.id}`}>
                                    {game.team1.map((player) => (
                                        <>
                                        {player.first_name} {player.surname}
                                        </>
                                    ))}
                                </TableCell>
                                <TableCell key={`team2-${game.id}`}>
                                    {game.team2.map((player) => (
                                        <>
                                        {player.first_name} {player.surname}
                                        </>
                                    ))}
                                </TableCell>
                                <TableCell key={`score-${game.id}`}>
                                    {game.score}
                                </TableCell>
                            </>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
        <TablePagination
            rowsPerPageOptions={[10, 25, 100]}
            component="div"
            count={games.length} // Update count for active members
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            />
    </Paper>
)};

export default Game_table;