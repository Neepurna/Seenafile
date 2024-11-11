import axios from 'axios';
import { TMDB_BASE_URL, TMDB_API_KEY } from '../config/api.config';

const axiosInstance = axios.create({
  baseURL: TMDB_BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
  },
  timeout: 10000, // Add timeout
});

// Add response interceptor
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";
export default axiosInstance;
