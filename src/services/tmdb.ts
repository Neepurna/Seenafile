// src/services/tmdb.ts

import axiosInstance from './instance';
import { Movie, MovieApiResponse } from './api';
import { API_CONFIG } from '../config/apiConfig';

const TMDB_API_KEY = API_CONFIG.TMDB_API_KEY;
const TMDB_BASE_URL = API_CONFIG.BASE_URL;

// Types and Interfaces
export interface CountryConfig {
  iso_3166_1: string;
  english_name: string;
  native_name: string;
}

export interface RegionGroup {
  name: string;
  countries: CountryConfig[];
}

export interface TMDBMovie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  overview: string;
  release_date: string;
  runtime?: number;
  genres?: Array<{
    id: number;
    name: string;
  }>;
}

// Constants
const FEATURED_COUNTRIES = {
  'India': { iso: 'IN', language: 'hi' },
  'Korea': { iso: 'KR', language: 'ko' },
  'Japan': { iso: 'JP', language: 'ja' },
  'France': { iso: 'FR', language: 'fr' },
  'China': { iso: 'CN', language: 'zh' },
  'Iran': { iso: 'IR', language: 'fa' }
} as const;

const FEATURED_REGIONS: RegionGroup[] = [
  {
    name: 'Asia',
    countries: ['IN', 'KR', 'JP', 'CN', 'TH', 'VN']
  },
  {
    name: 'Europe',
    countries: ['FR', 'DE', 'IT', 'ES', 'GB']
  },
  {
    name: 'Middle East',
    countries: ['IR', 'TR', 'EG']
  },
  {
    name: 'Americas',
    countries: ['BR', 'MX', 'AR']
  }
];

// Request Queue Implementation
const requestQueue = {
  queue: [] as (() => Promise<any>)[],
  processing: false,
  lastRequest: 0,
  minDelay: 250, // 250ms between requests
  
  add: function(request: () => Promise<any>) {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  },

  process: async function() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequest;
      
      if (timeSinceLastRequest < this.minDelay) {
        await new Promise(resolve => 
          setTimeout(resolve, this.minDelay - timeSinceLastRequest)
        );
      }
      
      const request = this.queue.shift();
      if (request) {
        await request();
        this.lastRequest = Date.now();
      }
    }
    this.processing = false;
  }
};

// Utility Functions
const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const normalizeMediaItem = (item: any) => {
  return {
    id: item.id,
    title: item.title || item.name || 'Unknown Title',
    name: item.name || item.title || 'Unknown Title',
    poster_path: item.poster_path || null,
    backdrop_path: item.backdrop_path || null,
    vote_average: item.vote_average || 0,
    vote_count: item.vote_count || 0,
    overview: item.overview || '',
    release_date: item.release_date || item.first_air_date || null,
    first_air_date: item.first_air_date || item.release_date || null,
    media_type: item.media_type || (item.name ? 'tv' : 'movie'),
    genre_ids: item.genre_ids || [],
    genres: item.genres || [],
  };
};

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

// Update fetchMovies to use the new queue
export const fetchMovies = async (page: number = 1) => {
  return requestQueue.add(async () => {
    const response = await axiosInstance.get(`/movie/popular`, { params: { page } });
    return response.data;
  });
};

// Function to fetch top-rated movies and include genres
export const fetchTopRatedMovies = async (page = 1) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&page=${page}`
  );
  return processMovieResponse(await response.json());
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
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/images?api_key=${TMDB_API_KEY}`
    );
    const data = await response.json();
    return {
      ...data,
      posters: data.posters || [],
      backdrops: data.backdrops || []
    };
  } catch (error) {
    console.error('Error fetching movie images:', error);
    return {
      posters: [],
      backdrops: []
    };
  }
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

// Update searchMovies function to be more robust
export const searchMovies = async (query: string, page: number = 1) => {
  if (!query.trim()) return { results: [] };
  
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query.trim())}&page=${page}&include_adult=false`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Map genre IDs to genre names
    const genres = await fetchGenres();
    
    const moviesWithGenres = data.results
      .filter(movie => movie.poster_path || movie.backdrop_path) // Only include movies with images
      .map((movie: any) => {
        const movieGenres = (movie.genre_ids || []).map((genreId: number) => {
          const genre = genres.find((g) => g.id === genreId);
          return genre ? genre : null;
        }).filter(Boolean);

        return {
          ...movie,
          genres: movieGenres,
          media_type: 'movie'
        };
      });

    return {
      ...data,
      results: moviesWithGenres
    };
  } catch (error) {
    console.error('Error searching movies:', error);
    return { results: [] };
  }
};

// Update searchTVShows function to match the improved pattern
export const searchTVShows = async (query: string, page: number = 1) => {
  if (!query.trim()) return { results: [] };
  
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query.trim())}&page=${page}&include_adult=false`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Map genre IDs to genre names
    const genres = await fetchGenres();
    
    const showsWithGenres = data.results
      .filter(show => show.poster_path || show.backdrop_path) // Only include shows with images
      .map((show: any) => ({
        ...show,
        title: show.name,
        name: show.name,
        poster_path: show.poster_path,
        media_type: 'tv',
        genres: (show.genre_ids || []).map((genreId: number) => {
          const genre = genres.find((g) => g.id === genreId);
          return genre ? genre : null;
        }).filter(Boolean)
      }));

    return {
      ...data,
      results: showsWithGenres
    };
  } catch (error) {
    console.error('Error searching TV shows:', error);
    return { results: [] };
  }
};

// Updated search function to combine movies and TV shows with better error handling and prioritize popularity and vote count
export const searchMoviesAndShows = async (query: string) => {
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/search/multi?api_key=${API_CONFIG.TMDB_API_KEY}&query=${encodedQuery}&include_adult=false&page=1`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.results || !Array.isArray(data.results)) {
      console.warn('Invalid search results format:', data);
      return [];
    }

    // Filter and normalize results
    const normalizedResults = data.results
      .filter(item => 
        // Only include movies and TV shows with valid data
        (item.media_type === 'movie' || item.media_type === 'tv') &&
        // Ensure basic required fields exist
        item.id &&
        (item.title || item.name) &&
        // Filter out items without images if needed
        (item.poster_path || item.backdrop_path)
      )
      .map(item => ({
        id: item.id,
        title: item.title || item.name,
        name: item.name || item.title,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        vote_average: item.vote_average || 0,
        vote_count: item.vote_count || 0,
        overview: item.overview || '',
        release_date: item.release_date || item.first_air_date || null,
        first_air_date: item.first_air_date || item.release_date || null,
        media_type: item.media_type,
        popularity: item.popularity || 0,
        genre_ids: item.genre_ids || []
      }));

    // Enhanced sorting that prioritizes both popularity and vote count
    // Calculate a combined score that weights both factors
    const sortedResults = normalizedResults.sort((a, b) => {
      // Normalize vote_count (0-10000 range common for TMDB)
      const normalizedVoteCountA = Math.min(a.vote_count || 0, 10000) / 10000;
      const normalizedVoteCountB = Math.min(b.vote_count || 0, 10000) / 10000;
      
      // Normalize popularity (0-1000 range common for TMDB)
      const normalizedPopularityA = Math.min(a.popularity || 0, 1000) / 1000;
      const normalizedPopularityB = Math.min(b.popularity || 0, 1000) / 1000;
      
      // Calculate combined score (60% popularity, 40% vote count)
      const scoreA = (normalizedPopularityA * 0.6) + (normalizedVoteCountA * 0.4);
      const scoreB = (normalizedPopularityB * 0.6) + (normalizedVoteCountB * 0.4);
      
      return scoreB - scoreA;
    });
    
    // Add debug log to help troubleshoot
    console.log(`Search for "${query}" found ${sortedResults.length} results`);
    
    return sortedResults;

  } catch (error) {
    console.error('Search error:', error);
    // Return empty array instead of throwing to prevent app crashes
    return [];
  }
};

// Function to fetch trending movies
export const fetchTrendingMovies = async () => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    return { results: [] }; // Return empty array on error
  }
};

// Function to fetch new releases
export const fetchNewReleases = async (page = 1) => {
  const today = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(today.getMonth() - 3);
  
  const response = await fetch(
    `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&sort_by=release_date.desc&primary_release_date.gte=${threeMonthsAgo.toISOString().split('T')[0]}&primary_release_date.lte=${today.toISOString().split('T')[0]}&page=${page}`
  );
  return processMovieResponse(await response.json());
};

// Function to fetch classic movies (movies before 2000)
export const fetchClassics = async (page = 1) => {
  const cutoffYear = '1990';
  const response = await fetch(
    `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&sort_by=vote_average.desc&primary_release_date.lte=${cutoffYear}-12-31&vote_count.gte=1000&page=${page}`
  );
  return processMovieResponse(await response.json());
};

// Function to fetch award-winning movies
export const fetchAwardWinners = async (page = 1) => {
  const awardKeywords = '1775,13405,6506,193,10221'; // Oscar, Golden Globe, Academy Award, etc.
  const response = await fetch(
    `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_keywords=${awardKeywords}&sort_by=vote_average.desc&vote_count.gte=1000&page=${page}`
  );
  return processMovieResponse(await response.json());
};

// Function to fetch critics' choice (highly rated movies)
export const fetchCriticsChoice = async (page = 1) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&sort_by=vote_average.desc&vote_count.gte=2000&vote_average.gte=7.5&page=${page}`
  );
  return processMovieResponse(await response.json());
};

// Function to fetch international movies (non-English movies)
export const fetchInternationalMovies = async (page = 1) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=!en&sort_by=popularity.desc&vote_count.gte=100&page=${page}`
  );
  return processMovieResponse(await response.json());
};

// Add new function to fetch animated shows
export const fetchAnimatedShows = async (page = 1) => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=16&sort_by=vote_average.desc&vote_count.gte=100&page=${page}`
    );
    const data = await response.json();
    const normalizedResults = data.results.map(normalizeMediaItem);
    return processMovieResponse({ ...data, results: normalizedResults });
  } catch (error) {
    console.error('Error fetching animated shows:', error);
    return { results: [] };
  }
};

// Update fetchTVShows to exclude animation genre
export const fetchTVShows = async (page = 1) => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&without_genres=16&sort_by=vote_average.desc&vote_count.gte=1000&page=${page}`
    );
    const data = await response.json();
    const normalizedResults = data.results.map(normalizeMediaItem);
    return processMovieResponse({ ...data, results: normalizedResults });
  } catch (error) {
    console.error('Error fetching TV shows:', error);
    return { results: [] };
  }
};

export const fetchDocumentaries = async (page = 1) => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=99&sort_by=vote_count.desc&vote_count.gte=1000&vote_average.gte=7&page=${page}`
    );
    const data = await response.json();
    return processMovieResponse(data);
  } catch (error) {
    console.error('Error fetching documentaries:', error);
    return { results: [] };
  }
};

// Helper function to process movie response and add genres
const processMovieResponse = async (data: any) => {
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

// Add this new function to fetch available countries
export const fetchAvailableCountries = async (): Promise<CountryConfig[]> => {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/configuration/countries?api_key=${TMDB_API_KEY}`
    );
    if (!response.ok) throw new Error('Failed to fetch countries');
    return await response.json();
  } catch (error) {
    console.error('Error fetching countries:', error);
    return [];
  }
};

// Update the movie fetching function to be more centralized
export const fetchMoviesByCategory = async (page: number, options: any = {}) => {
  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/trending/all/day?api_key=${API_CONFIG.TMDB_API_KEY}&page=${page}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    return { results: [] };
  }
};

// Add this helper function for processing results
const processAndNormalizeResults = (data: any) => {
  const normalizedResults = data.results
    .filter((item: any) => (
      item.poster_path && 
      item.vote_count >= 100 &&
      item.vote_average >= 6
    ))
    .map(normalizeMediaItem)
    .sort(() => Math.random() - 0.5);

  return {
    ...data,
    results: normalizedResults
  };
};

// Function to fetch movie trailers and videos
export const fetchMovieTrailers = async (page = 1) => {
  try {
    const trendingMovies = await fetchTrendingMovies(page);
    const trailerPromises = trendingMovies.results.map(async movie => {
      const videos = await fetchMovieVideos(movie.id);
      return videos.results.filter(video => 
        video.type === 'Trailer' && video.site === 'YouTube'
      );
    });
    
    const trailers = await Promise.all(trailerPromises);
    return trailers.flat();
  } catch (error) {
    console.error('Error fetching trailers:', error);
    return [];
  }
};

// Update fetchMoviesByCountry function
export const fetchMoviesByCountry = async (
  iso_3166_1: string,
  page: number = 1
): Promise<any> => {
  try {
    const url = `${TMDB_BASE_URL}/discover/movie`;
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      with_original_language: iso_3166_1.toLowerCase(),
      region: iso_3166_1,
      sort_by: 'popularity.desc',
      'vote_count.gte': '100',
      'vote_average.gte': '6.5',
      page: page.toString()
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();
    return processAndNormalizeResults(data);
  } catch (error) {
    console.error(`Error fetching movies for country ${iso_3166_1}:`, error);
    return { results: [] };
  }
};
