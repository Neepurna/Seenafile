// tmdb.ts
import axios from 'axios';

export const TMDB_API_KEY = '559819d48b95a2e3440df0504dea30fd'; // Replace with your TMDB API Key

const BASE_URL = 'https://api.themoviedb.org/3';

const tmdb = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
    language: 'en-US',
  },
});

// Function to fetch movies from a specific endpoint
export const fetchMovies = async (endpoint: string, additionalParams = {}) => {
  try {
    const response = await tmdb.get(endpoint, {
      params: {
        ...additionalParams,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching data from TMDB:', error);
    throw error;
  }
};

export default tmdb;
