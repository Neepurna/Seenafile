// src/services/tmdb.ts

import axiosInstance from './instance';

const TMDB_API_KEY = '559819d48b95a2e3440df0504dea30fd'; // Replace with your TMDB API key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Add rate limiting
const REQUESTS_PER_SECOND = 4;
const REQUEST_QUEUE: (() => Promise<any>)[] = [];
let processing = false;

const processQueue = async () => {
  if (processing || REQUEST_QUEUE.length === 0) return;
  
  processing = true;
  while (REQUEST_QUEUE.length > 0) {
    const request = REQUEST_QUEUE.shift();
    if (request) {
      await request();
      await new Promise(resolve => setTimeout(resolve, 1000 / REQUESTS_PER_SECOND));
    }
  }
  processing = false;
};

const queueRequest = (request: () => Promise<any>) => {
  return new Promise((resolve, reject) => {
    REQUEST_QUEUE.push(async () => {
      try {
        const result = await request();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    processQueue();
  });
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

// Function to fetch movies (e.g., popular movies) and include genres
export const fetchMovies = async (page: number = 1) => {
  return queueRequest(async () => {
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

// Function to search movies
export const searchMovies = async (query: string, page: number = 1) => {
  if (!query.trim()) return { results: [] };
  
  const response = await fetch(
    `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=${page}`
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

// Function to search TV shows
export const searchTVShows = async (query: string, page: number = 1) => {
  if (!query.trim()) return { results: [] };
  
  const response = await fetch(
    `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=${page}`
  );
  const data = await response.json();

  // Map genre IDs to genre names
  const genres = await fetchGenres();
  
  const showsWithGenres = data.results.map((show: any) => ({
    ...show,
    title: show.name, // Map TV show name to title for consistency
    poster_path: show.poster_path,
    media_type: 'tv',
    genres: show.genre_ids.map((genreId: number) => {
      const genre = genres.find((g) => g.id === genreId);
      return genre ? genre : null;
    }).filter((g: any) => g !== null)
  }));

  return { ...data, results: showsWithGenres };
};

// Updated search function to combine movies and TV shows
export const searchMoviesAndShows = async (query: string, page: number = 1) => {
  if (!query.trim()) return { results: [] };

  try {
    const [moviesData, tvShowsData] = await Promise.all([
      searchMovies(query, page),
      searchTVShows(query, page)
    ]);

    const combinedResults = [
      ...(moviesData.results || []).map(item => ({ ...item, media_type: 'movie' })),
      ...(tvShowsData.results || [])
    ];

    // Sort by popularity (assuming vote_average as popularity metric)
    combinedResults.sort((a, b) => b.vote_average - a.vote_average);

    return { results: combinedResults };
  } catch (error) {
    console.error('Search error:', error);
    return { results: [] };
  }
};

// Function to fetch trending movies
export const fetchTrendingMovies = async (page = 1) => {
  const response = await fetch(
    `${TMDB_BASE_URL}/trending/movie/day?api_key=${TMDB_API_KEY}&page=${page}`
  );
  return processMovieResponse(await response.json());
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

// Add these types at the top
export interface CountryConfig {
  iso_3166_1: string;
  english_name: string;
  native_name: string;
}

// Add this constant for featured countries
const FEATURED_COUNTRIES = {
  'India': { iso: 'IN', language: 'hi' },
  'Korea': { iso: 'KR', language: 'ko' },
  'Japan': { iso: 'JP', language: 'ja' },
  'France': { iso: 'FR', language: 'fr' },
  'China': { iso: 'CN', language: 'zh' },
  'Iran': { iso: 'IR', language: 'fa' }
} as const;

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
export const fetchMoviesByCategory = async (
  category: string,
  page: number = 1,
  options: { language?: string; region?: string } = {}
) => {
  try {
    const randomPage = Math.floor(Math.random() * 20) + 1;
    const actualPage = page > 1 ? page : randomPage;
    
    // Base query parameters
    const baseParams = {
      api_key: TMDB_API_KEY,
      page: actualPage,
      'vote_count.gte': 100,
      ...options
    };

    let endpoint = `${TMDB_BASE_URL}/discover/movie`;
    let additionalParams = {};

    // Handle different categories
    if (category in FEATURED_COUNTRIES) {
      const countryConfig = FEATURED_COUNTRIES[category];
      additionalParams = {
        with_original_language: countryConfig.language,
        region: countryConfig.iso,
        sort_by: 'vote_count.desc',
        'vote_count.gte': 200,
        'vote_average.gte': 6.5
      };
    } else {
      switch (category.toLowerCase()) {
        case 'documentaries':
          additionalParams = {
            with_genres: '99',
            'vote_count.gte': 500,
            'vote_average.gte': 7
          };
          break;
        case 'animated':
          endpoint = `${TMDB_BASE_URL}/discover/movie`;
          additionalParams = {
            with_genres: '16',
            'vote_count.gte': 300
          };
          break;
        case 'tv shows':
          endpoint = `${TMDB_BASE_URL}/discover/tv`;
          additionalParams = {
            'vote_count.gte': 200,
            sort_by: 'popularity.desc'
          };
          break;
        case 'all':
        default:
          endpoint = `${TMDB_BASE_URL}/movie/popular`;
          break;
      }
    }

    const queryParams = new URLSearchParams({
      ...baseParams,
      ...additionalParams
    }).toString();

    const response = await fetch(`${endpoint}?${queryParams}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    return processAndNormalizeResults(data);
  } catch (error) {
    console.error(`Error fetching ${category} content:`, error);
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

// Remove redundant individual fetch functions that are now handled by fetchMoviesByCategory

// Add this utility function
const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Add this normalization function at the top with other utility functions
const normalizeMediaItem = (item: any) => {
  return {
    id: item.id,
    title: item.title || item.name,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    vote_average: item.vote_average,
    vote_count: item.vote_count,
    overview: item.overview,
    release_date: item.release_date || item.first_air_date,
    media_type: item.name ? 'tv' : 'movie',
    genre_ids: item.genre_ids,
    genres: item.genres,
  };
};

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

// Add these constants at the top
const COUNTRIES = {
  'India': 'in',
  'Korea': 'ko',
  'Japan': 'ja',
  'France': 'fr',
  'China': 'zh',
  'Iran': 'fa'
};

// Add these interfaces
export interface CountryConfig {
  iso_3166_1: string;
  english_name: string;
  native_name: string;
}

export interface RegionGroup {
  name: string;
  countries: CountryConfig[];
}

// Add these constants
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

// Add this new function to fetch countries
export const fetchCountries = async (): Promise<CountryConfig[]> => {
  const url = `${TMDB_BASE_URL}/configuration/countries`;
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1NTk4MTlkNDhiOTVhMmUzNDQwZGYwNTA0ZGVhMzBmZCIsIm5iZiI6MTcwNDY2MDA0OC45NDIwMDAyLCJzdWIiOiI2NTliMGM1MDg3NDFjNDAyNTg5NDc3OTMiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.WbiASUzKIPL9_1xX9xfUUZNV6yV4OEOjSvYGVxd6NFg'
    }
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching countries:', error);
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
