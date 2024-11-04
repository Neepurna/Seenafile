// src/services/tmdb.ts

const TMDB_API_KEY = '559819d48b95a2e3440df0504dea30fd'; // Replace with your TMDB API key
// src/services/tmdb.ts


const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Function to fetch top-rated movies
export const fetchTopRatedMovies = async (page = 1) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
  );
  return response.json();
};

// Function to fetch highest-rated movies (by popularity)
export const fetchHighestRatedMovies = async (page = 1) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
  );
  return response.json();
};

// Function to fetch movies by genre
export const fetchMoviesByGenre = async (genreId: number, page = 1) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&with_genres=${genreId}&page=${page}`
  );
  return response.json();
};

// Function to fetch detailed movie information
export const fetchMovieDetails = async (movieId: number) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`
  );
  return response.json();
};

// Function to fetch movie reviews
export const fetchMovieReviews = async (movieId: number, page = 1) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/movie/${movieId}/reviews?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
  );
  return response.json();
};
