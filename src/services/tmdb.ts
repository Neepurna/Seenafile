// src/services/tmdb.ts

const TMDB_API_KEY = '559819d48b95a2e3440df0504dea30fd'; // Replace with your TMDB API key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Fetch the list of genres once and cache it
let genresList: { id: number; name: string }[] = [];

// Function to fetch genres
export const fetchGenres = async () => {
  if (genresList.length > 0) {
    return genresList;
  }
  const response = await fetch(
    `${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`
  );
  const data = await response.json();
  genresList = data.genres;
  return genresList;
};

// Function to fetch movies (e.g., popular movies) and include genres
export const fetchMovies = async (page = 1) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
  );
  const data = await response.json();

  // Map genre IDs to genre names
  const genres = await fetchGenres();

  const moviesWithGenres = data.results.map((movie: any) => {
    const movieGenres = movie.genre_ids.map((genreId: number) => {
      const genre = genres.find((g) => g.id === genreId);
      return genre ? genre : null;
    });
    return { ...movie, genres: movieGenres.filter((g: any) => g !== null) };
  });

  return { ...data, results: moviesWithGenres };
};

// Function to fetch top-rated movies and include genres
export const fetchTopRatedMovies = async (page = 1) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
  );
  const data = await response.json();

  // Map genre IDs to genre names
  const genres = await fetchGenres();

  const moviesWithGenres = data.results.map((movie: any) => {
    const movieGenres = movie.genre_ids.map((genreId: number) => {
      const genre = genres.find((g) => g.id === genreId);
      return genre ? genre : null;
    });
    return { ...movie, genres: movieGenres.filter((g: any) => g !== null) };
  });

  return { ...data, results: moviesWithGenres };
};

// Function to fetch highest-rated movies (by popularity) and include genres
export const fetchHighestRatedMovies = async (page = 1) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
  );
  const data = await response.json();

  // Map genre IDs to genre names
  const genres = await fetchGenres();

  const moviesWithGenres = data.results.map((movie: any) => {
    const movieGenres = movie.genre_ids.map((genreId: number) => {
      const genre = genres.find((g) => g.id === genreId);
      return genre ? genre : null;
    });
    return { ...movie, genres: movieGenres.filter((g: any) => g !== null) };
  });

  return { ...data, results: moviesWithGenres };
};

// Function to fetch movies by genre and include genres
export const fetchMoviesByGenre = async (genreId: number, page = 1) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&with_genres=${genreId}&page=${page}`
  );
  const data = await response.json();

  // Map genre IDs to genre names
  const genres = await fetchGenres();

  const moviesWithGenres = data.results.map((movie: any) => {
    const movieGenres = movie.genre_ids.map((genreId: number) => {
      const genre = genres.find((g) => g.id === genreId);
      return genre ? genre : null;
    });
    return { ...movie, genres: movieGenres.filter((g: any) => g !== null) };
  });

  return { ...data, results: moviesWithGenres };
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

// Function to fetch movie images
export const fetchMovieImages = async (movieId: number) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/movie/${movieId}/images?api_key=${TMDB_API_KEY}`
  );
  return response.json();
};

// Function to fetch movie credits (cast and crew)
export const fetchMovieCredits = async (movieId: number) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`
  );
  return response.json();
};

// Function to fetch movie videos
export const fetchMovieVideos = async (movieId: number) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=en-US`
  );
  return response.json();
};
