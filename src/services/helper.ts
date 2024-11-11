import axiosInstance from "./instance";
import { Genre, Movie, CastMember, CrewMember, MovieResponse } from "./api";
import { TMDB_API_KEY, TMDB_BASE_URL } from '../config/api.config';

// Cache for genres
let genresCache: Genre[] = [];

export const fetchCategories = async (): Promise<Genre[]> => {
  if (genresCache.length > 0) return genresCache;
  
  try {
    const response = await axiosInstance.get<{ genres: Genre[] }>('genre/movie/list');
    genresCache = response.data.genres;
    return genresCache;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    throw error;
  }
};

// Add randomization to movie fetching
const getRandomPage = (totalPages: number) => Math.floor(Math.random() * Math.min(totalPages, 500)) + 1;

export const fetchRandomMovies = async (
  category: string,
  limit: number,
  options?: Record<string, any>
) => {
  try {
    let endpoint = '';
    const params: Record<string, any> = {
      api_key: TMDB_API_KEY,
      language: 'en-US',
    };

    if (category === 'discover') {
      endpoint = '/discover/movie';
      // Add additional params for discover endpoint
      Object.assign(params, {
        ...options,
        include_adult: false,
        include_video: false,
        page: Math.floor(Math.random() * 20) + 1, // Random page between 1-20
      });
    } else {
      endpoint = `/movie/${category}`;
      params.page = Math.floor(Math.random() * 20) + 1;
    }

    const response = await axiosInstance.get(endpoint, { params });

    return response.data.results.slice(0, limit);
  } catch (error) {
    console.error(`Error fetching ${category} movies:`, error);
    return [];
  }
};

// Add the rest of your existing functions with improved error handling and types
// ... (keep your existing functions)

// Utility function to shuffle array
export const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const fetchMovie = async (movieId: number): Promise<Movie> => {
  try {
    const response = await axiosInstance.get(`movie/${movieId}`);
    return response.data as Movie;
  } catch (error) {
    console.error(`Error fetching movie ${movieId}:`, error);
    throw error;
  }
}

const fetchMoviesByIds = async (movieIds: number[]): Promise<Movie[]> => {
  try {
    const moviePromises = movieIds.map(id => fetchMovie(id));
    const results = await Promise.all(moviePromises);
    return results;
  } catch (error) {
    console.error('Error fetching movies:', error);
    throw error;
  }
};

const fetchRandomPopularMovie = async (): Promise<Movie> => {
  try {
    const response = await axiosInstance.get(`movie/popular`);
    const randomIndex = Math.floor(Math.random() * response.data.results.length);
    return response.data.results[randomIndex] as Movie;
  } catch (error) {
    console.error(`Error fetching random popular movie:`, error);
    throw error;
  }
}

const fetchMovieCast = async (movieId: number): Promise<CastMember[]> => {
  try {
    const response = await axiosInstance.get<{ cast: CastMember[] }>(`movie/${movieId}/credits`);
    return response.data.cast;
  } catch (error) {
    console.error(`Failed to fetch cast for movie ${movieId}:`, error);
    throw error;
  }
};

const fetchMovieCrew = async (movieId: number): Promise<CrewMember[]> => {
  try {
    const response = await axiosInstance.get<{ crew: CrewMember[] }>(`movie/${movieId}/credits`);
    return response.data.crew;
  } catch (error) {
    console.error(`Failed to fetch crew for movie ${movieId}:`, error);
    throw error;
  }
};

const fetchNowPlayingMovies = async (): Promise<Movie[]> => {
  try {
    const response = await axiosInstance.get<{ results: Movie[] }>('/movie/now_playing', { params: { page: 1 } });
    return response.data.results;
  } catch (error) {
    console.error('Error fetching now playing movies:', error);
    throw error;
  }
};

const fetchUpcomingMovies = async (): Promise<Movie[]> => {
  try {
    const response = await axiosInstance.get<{ results: Movie[] }>('/movie/upcoming', { params: { page: 1 } });
    return response.data.results;
  } catch (error) {
    console.error('Error fetching upcoming movies:', error);
    throw error;
  }
};

const fetchPopularMovies = async (): Promise<Movie[]> => {
  try {
    const response = await axiosInstance.get<{ results: Movie[] }>('/movie/popular', { params: { page: 1 } });
    return response.data.results;
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    throw error;
  }
};

const fetchTrendingMovies = async (limit: number = 10, timeframe: 'day' | 'week' = 'day'): Promise<Movie[]> => {
  try {
    const response = await axiosInstance.get<{ results: Movie[] }>(`/trending/movie/${timeframe}`);
    return response.data.results.slice(0, limit);
  } catch (error) {
    console.error(`Error fetching trending content for ${timeframe}:`, error);
    throw error;
  }
};

const fetchSimilarMovies = async (movieId: number): Promise<Movie[]> => {
  try {
    const response = await axiosInstance.get<{ results: Movie[] }>(`/movie/${movieId}/similar`);
    return response.data.results;
  } catch (error) {
    console.error(`Error fetching similar movies to movie ${movieId}:`, error);
    throw error;
  }
};

const fetchMoviesByGenre = async (genreId: number): Promise<Movie[]> => {
  try {
    const response = await axiosInstance.get<{results: Movie[]}>(`discover/movie`, {
      params: { with_genres: genreId }
    });
    return response.data.results;
  } catch (error) {
    console.error(`Error fetching movies by genre ${genreId}:`, error);
    throw error;
  }
};

const fetchMoviesByQuery = async (query: string): Promise<Movie[]> => {
  try {
    const response = await axiosInstance.get<{results: Movie[]}>("search/movie", {
      params: { query: query }
    });
    return response.data.results;
  } catch (error) {
    console.error(`Error fetching movies by title ${query}:`, error);
    throw error;
  }
};

// Remove or comment out this function since it's defined in tmdb.ts
// export const fetchMoviesByCategory = async (category: string, page: number = 1) => {
//   try {
//     switch (category.toLowerCase()) {
//       case 'trending':
//         return await fetchTrendingMovies(page);
//       case 'new releases':
//         return await fetchNewReleases(page);
//       case 'top rated':
//         return await fetchTopRatedMovies(page);
//       case 'classics':
//         return await fetchClassics(page);
//       case 'award winners':
//         return await fetchAwardWinners(page);
//       case "critics' choice":
//         return await fetchCriticsChoice(page);
//       case 'international':
//         return await fetchInternationalMovies(page);
//       case 'tv shows':
//         // Add your TV shows fetching logic here
//         return await fetchMovies(page); // Temporary fallback
//       case 'documentaries':
//         // Use genre ID 99 for documentaries
//         return await fetchMoviesByGenre(99, page);
//       case 'all':
//       default:
//         return await fetchMovies(page);
//     }
//   } catch (error) {
//     console.error(`Error fetching ${category} movies:`, error);
//     return { results: [] };
//   }
// };

export {
  fetchCategories,
  fetchMovie,
  fetchMoviesByIds,
  fetchMovieCast,
  fetchMovieCrew,
  fetchMoviesByGenre,
  fetchNowPlayingMovies,
  fetchPopularMovies,
  fetchRandomPopularMovie,
  fetchSimilarMovies,
  fetchTrendingMovies,
  fetchUpcomingMovies,
  fetchMoviesByQuery,
  shuffleArray
};