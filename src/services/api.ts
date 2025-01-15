export interface Genre {
  id: number;
  name: string;
}

export interface Movie {
  id: number;
  title: string;        // Make title required
  name?: string;        // Keep name optional
  displayTitle?: string; // Add a computed property that will always have a value
  media_type?: 'movie' | 'tv'; // Update this line to remove string from union type
  overview: string;
  poster_path: string | null;
  backdrop_path?: string;  // Add this line
  release_date: string;
  runtime: number;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genres: Genre[];
  genre_ids?: number[];  // For movie lists that return genre IDs instead of full genres
  uniqueKey?: string;    // For FlatList optimization
}

export interface MovieResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

export interface MovieApiResponse {
  results: Movie[];
  page: number;
  total_pages: number;
  total_results: number;
}

export interface CastMember {
  cast_id: number;
  id: number;
  character: string;
  name: string;
  profile_path: string;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
}

// Add a utility function to ensure we always have a title
export const normalizeMovie = (movie: Movie): Movie => ({
  ...movie,
  title: movie.title || movie.name || 'Untitled',
  displayTitle: movie.title || movie.name || 'Untitled'
});

// Add this new function for movie searches
export const searchMovies = async (query: string): Promise<Movie[]> => {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false`
    );
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error searching movies:', error);
    return [];
  }
};