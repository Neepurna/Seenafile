export interface Genre {
  id: number;
  name: string;
}

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
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