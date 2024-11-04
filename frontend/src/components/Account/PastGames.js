import axios from "axios";
import { useEffect, useState } from "react";
import { game_columns } from "../Events/consts/columns";
import Game_table from "../tables/game_display_table";


function PastGames() {
    const [games, setGames] = useState([]);

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

    // Fetches games
    const fetchGames = async () => {

        try {
            const token = localStorage.getItem('access_token');
            const headers =   {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json',
                accept: 'application/json',
            }
          const response = await axios.get(`http://127.0.0.1:8000/game/users/games/`, {
          headers: headers
        });
            setGames(response.data);
            console.log(response.data);
        
        } catch (error) {
            console.error('Error fetching games:', error);
        }
      };

    // Initial fetch when loading the games
    useEffect(() => {
        fetchGames()
    }, []);

    return(
        <>
        {Game_table(
          game_columns,
          games, 
          page2,
          rowsPerPage2,
          handleChangePage2,
          handleChangeRowsPerPage,
        )}
        </>
    )
};

export default PastGames;