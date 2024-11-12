import axios from 'axios';
import { TMDB_BASE_URL, TMDB_API_KEY } from '../config/api.config';

const axiosInstance = axios.create({
  baseURL: TMDB_BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
  },
  timeout: 15000, // Increased timeout
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for retry logic
axiosInstance.interceptors.request.use(
  config => {
    // Add retry config
    config.metadata = { retryCount: 0 };
    return config;
  },
  error => Promise.reject(error)
);

// Enhanced response interceptor with retry logic
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const { config } = error;
    if (!config || !config.metadata) return Promise.reject(error);

    // Maximum retry attempts
    const MAX_RETRIES = 3;
    
    // Only retry on network errors or 5xx errors
    if (config.metadata.retryCount < MAX_RETRIES && 
        (!error.response || (error.response.status >= 500 && error.response.status < 600))) {
      config.metadata.retryCount += 1;

      // Exponential backoff
      const backoffDelay = Math.pow(2, config.metadata.retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffDelay));

      return axiosInstance(config);
    }

    return Promise.reject(error);
  }
);

// Image base URLs with fallbacks
export const IMAGE_BASE_URLS = [
  'https://image.tmdb.org/t/p/original',
  'https://image.tmdb.org/t/p/w500',
  'https://image.tmdb.org/t/p/w342',
  'https://image.tmdb.org/t/p/w185',
];

// Helper function to get working image URL
export const getImageUrl = async (path: string | null, size: 'original' | 'w500' | 'w342' | 'w185' = 'w500'): Promise<string> => {
  if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';

  // Try different image sizes until one works
  for (const baseUrl of IMAGE_BASE_URLS) {
    try {
      const url = `${baseUrl}${path}`;
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) return url;
    } catch (error) {
      continue;
    }
  }

  // Return placeholder if all attempts fail
  return 'https://via.placeholder.com/500x750?text=No+Image';
};

export default axiosInstance;
