
import { useEffect, useState } from "react";
import { game_columns } from "../Events/consts/columns";
import Game_table from "../tables/game_display_table";
import { useParams } from "react-router-dom";
import { fetchUserGames_game_type } from "../functions/fetch_functions";
import type { CompleteGame } from "../../types";



function GameTypeElos() {
    const [games, setGames] = useState<CompleteGame[]>([]);
    const { game_type } = useParams();

    // Controlling the table
    const [page2, setPage2] = useState(0);
    const [rowsPerPage2, setRowsPerPage2] = useState(10);

    const handleChangePage2 = (_event: unknown, newPage: number) => {
        setPage2(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage2(parseInt(event.target.value, 10));
        setPage2(0);
    };

    // Initial fetch when loading the games
    useEffect(() => {
        if (game_type) {
            fetchUserGames_game_type(setGames, game_type);
        }
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

export default GameTypeElos;
