import { useState, useEffect } from 'react';
import { getRandomMovies } from '../services/tmdb'; // Ensure this path is correct

const useRandomMovies = () => {
  const [movies, setMovies] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchMovies = async () => {
    setLoading(true);
    const newMovies = await getRandomMovies(page);
    setMovies((prevMovies) => [...prevMovies, ...newMovies]);
    setLoading(false);
  };

  useEffect(() => {
    fetchMovies();
  }, [page]);

  const loadMoreMovies = () => {
    if (!loading) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  return { movies, loadMoreMovies };
};

export default useRandomMovies;
