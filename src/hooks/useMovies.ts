import { useState, useEffect } from 'react';
import { TMDBMovie } from '../services/tmdb';

interface UseMoviesReturn {
  movies: TMDBMovie[];
  isLoading: boolean;
  error: Error | null;
}

export const useMovies = (): UseMoviesReturn => {
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/popular?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`
        );
        const data = await response.json();
        setMovies(data.results);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch movies'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovies();
  }, []);

  return { movies, isLoading, error };
};
