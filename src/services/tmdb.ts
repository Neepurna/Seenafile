// src/services/tmdb.ts

import axios, { AxiosInstance } from 'axios';

// Your TMDB API Key
export const TMDB_API_KEY = '559819d48b95a2e3440df0504dea30fd'; // Replace with your TMDB API Key

const BASE_URL = 'https://api.themoviedb.org/3';

// Create an Axios instance with default configurations
const tmdb: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
    language: 'en-US', // Default language
  },
});

// General function to fetch data from TMDB
const fetchFromTMDB = async (endpoint: string, params = {}) => {
  try {
    const response = await tmdb.get(endpoint, {
      params: {
        ...params,
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      // The request was made, and the server responded with a status code outside of the 2xx range
      console.error(`TMDB API Error [${error.response.status}]: ${error.response.data.status_message}`);
    } else if (error.request) {
      // The request was made, but no response was received
      console.error('TMDB API Error: No response received from the server.');
    } else {
      // Something else happened while setting up the request
      console.error('TMDB API Error:', error.message);
    }
    throw error;
  }
};

// Function to fetch top-rated movies
export const fetchTopRatedMovies = async (page: number = 1) => {
  return await fetchFromTMDB('/movie/top_rated', { page });
};

// Function to fetch popular movies by genre
export const fetchMoviesByGenre = async (genreId: number, page: number = 1) => {
  return await fetchFromTMDB('/discover/movie', {
    with_genres: genreId,
    sort_by: 'popularity.desc',
    page,
  });
};

// Function to fetch highest-rated movies
export const fetchHighestRatedMovies = async (page: number = 1) => {
  return await fetchFromTMDB('/discover/movie', {
    sort_by: 'vote_average.desc',
    'vote_count.gte': 1000,
    page,
  });
};

// Function to search for movies
export const searchMovies = async (query: string, page: number = 1) => {
  return await fetchFromTMDB('/search/movie', {
    query,
    page,
  });
};

// Export the general fetch function if needed elsewhere
export { fetchFromTMDB };

export default tmdb;
