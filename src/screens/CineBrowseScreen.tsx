import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import MovieCard from '../components/MovieCard';
import { fetchMovies } from '../services/tmdb';

// Define a Movie interface
interface Movie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  overview: string;
}

// Genre IDs for fetching movies
const genres = [
    { label: 'Action Movies', id: 28 }, // Action
    { label: 'Adventure Movies', id: 12 }, // Adventure
    { label: 'Animation Movies', id: 16 }, // Animation
    { label: 'Comedy Movies', id: 35 }, // Comedy
    { label: 'Crime Movies', id: 80 }, // Crime
    { label: 'Documentary Movies', id: 99 }, // Documentary
    { label: 'Drama Movies', id: 18 }, // Drama
    { label: 'Family Movies', id: 10751 }, // Family
    { label: 'Fantasy Movies', id: 14 }, // Fantasy
    { label: 'History Movies', id: 36 }, // History
    { label: 'Horror Movies', id: 27 }, // Horror
    { label: 'Music Movies', id: 10402 }, // Music
    { label: 'Mystery Movies', id: 9648 }, // Mystery
    { label: 'Romance Movies', id: 10749 }, // Romance
    { label: 'Science Fiction Movies', id: 878 }, // Science Fiction
    { label: 'TV Movies', id: 10770 }, // TV Movie
    { label: 'Thriller Movies', id: 53 }, // Thriller
    { label: 'War Movies', id: 10752 }, // War
    { label: 'Western Movies', id: 37 }, // Western
    { label: 'Foreign', id: 10769 }, // Foreign
];

const CineBrowseScreen = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMoviesByGenre = async () => {
      try {
        const allMovies: Movie[] = [];
        const movieIds = new Set<number>();

        for (const genre of genres) {
          for (let page = 1; page <= 3; page++) {
            const response = await fetchMovies('/discover/movie', {
              with_genres: genre.id,
              sort_by: 'popularity.desc',
              'vote_count.gte': 1000,
              page: page,
            });

            const validMovies = response.results.filter((movie: Movie) => {
              if (movie.poster_path && !movieIds.has(movie.id)) {
                movieIds.add(movie.id);
                return true;
              }
              return false;
            });

            allMovies.push(...validMovies);
          }
        }

        setMovies(shuffleArray(allMovies));
      } catch (error) {
        console.error('Error fetching movies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMoviesByGenre();
  }, []);

  const shuffleArray = (array: Movie[]): Movie[] => {
    return array.sort(() => Math.random() - 0.5);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Swiper
        cards={movies}
        renderCard={(movie) => <MovieCard movie={movie} />}
        infinite
        backgroundColor="transparent"
        cardVerticalMargin={10} // Small margin to create space between stacked cards
        stackSize={3} // Show the main card + 2 cards behind
        stackSeparation={15} // Separation between the stacked cards
        overlayLabels={{
          left: {
            title: 'NOPE',
            style: {
              label: {
                color: 'red',
                fontSize: 24,
              },
              wrapper: {
                flexDirection: 'column',
                alignItems: 'flex-end',
                justifyContent: 'flex-start',
                marginTop: 30,
                marginLeft: -30,
              },
            },
          },
          right: {
            title: 'LIKE',
            style: {
              label: {
                color: 'green',
                fontSize: 24,
              },
              wrapper: {
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                marginTop: 30,
                marginLeft: 30,
              },
            },
          },
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CineBrowseScreen;
