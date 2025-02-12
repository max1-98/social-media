import { useEffect, useState } from "react";
import { game_columns } from "../Events/consts/columns";
import Game_table from "../tables/game_display_table";
import { fetchUserGames } from "../functions/fetch_functions";
import { Box, Paper } from "@mui/material";


function PastGames() {
    const [games, setGames] = useState([]);
    const [error, setError] = useState('');

    // Controlling the table
    const [page2, setPage2] = useState(0);
    const [rowsPerPage2, setRowsPerPage2] = useState(10);

    const handleChangePage2 = (event, newPage) => {
        setPage2(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage2(parseInt(event.target.value, 10));
        setPage2(0);
    };

    // Initial fetch when loading the games
    useEffect(() => {
        fetchUserGames({setGames: setGames, setError: setError})
    }, []);


    return(
        <Box>
            {Game_table(
            game_columns,
            games, 
            page2,
            rowsPerPage2,
            handleChangePage2,
            handleChangeRowsPerPage,
            )}
        </Box>
    )
};

export default PastGames;