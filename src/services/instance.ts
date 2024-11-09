import axios from 'axios';
import { TMDB_BASE_URL, TMDB_API_KEY } from '../config/api.config';

const API_KEY = "559819d48b95a2e3440df0504dea30fd";
const BASE_URL = "https://api.themoviedb.org/3/";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";

const axiosInstance = axios.create({
  baseURL: TMDB_BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
  },
});

export { IMAGE_BASE_URL };
export default axiosInstance;
