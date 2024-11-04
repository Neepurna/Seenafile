// src/screens/CineBrowseScreen.tsx

import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import FlipCard from '../components/FlipCard';
import {
  fetchTopRatedMovies,
  fetchMoviesByGenre,
  fetchHighestRatedMovies,
} from '../services/tmdb';

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  overview: string;
}

const genres = [
  { label: 'Action', id: 28 },
  { label: 'Adventure', id: 12 },
  { label: 'Animation', id: 16 },
  { label: 'Comedy', id: 35 },
  { label: 'Crime', id: 80 },
  { label: 'Documentary', id: 99 },
  { label: 'Drama', id: 18 },
  { label: 'Family', id: 10751 },
  { label: 'Fantasy', id: 14 },
  { label: 'History', id: 36 },
  { label: 'Horror', id: 27 },
  { label: 'Music', id: 10402 },
  { label: 'Mystery', id: 9648 },
  { label: 'Romance', id: 10749 },
  { label: 'Science Fiction', id: 878 },
  { label: 'TV Movie', id: 10770 },
  { label: 'Thriller', id: 53 },
  { label: 'War', id: 10752 },
  { label: 'Western', id: 37 },
];

const MAX_PAGE = 500; // Maximum page number allowed by TMDB API

const CineBrowseScreen: React.FC = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [swipingEnabled, setSwipingEnabled] = useState(true);

  // Use useRef to persist across renders
  const displayedMovieIds = useRef<Set<number>>(new Set());

  // Initialize genrePages directly
  const initialGenrePages: { [key: number]: number } = {};
  genres.forEach((genre) => {
    initialGenrePages[genre.id] = 1;
  });
  const [genrePages, setGenrePages] = useState<{ [key: number]: number }>(initialGenrePages);

  // Current pages for each category
  const [topRatedPage, setTopRatedPage] = useState(1);
  const [highestRatedPage, setHighestRatedPage] = useState(1);

  useEffect(() => {
    // Initial fetch
    fetchMoreMovies();
  }, []);

  const fetchMoreMovies = async () => {
    try {
      setLoading(true);

      // Number of pages to fetch per category
      const pagesToFetch = 2; // Adjust as needed

      // Fetch movies from different categories
      const topRatedPromises = [];
      const highestRatedPromises = [];
      const genrePromises = [];

      // Fetch multiple pages for top-rated movies
      for (let i = 0; i < pagesToFetch; i++) {
        let page = topRatedPage + i;
        if (page > MAX_PAGE) {
          page = 1; // Reset to 1 if exceeding MAX_PAGE
        }
        topRatedPromises.push(fetchTopRatedMovies(page));
      }

      // Fetch multiple pages for highest-rated movies
      for (let i = 0; i < pagesToFetch; i++) {
        let page = highestRatedPage + i;
        if (page > MAX_PAGE) {
          page = 1;
        }
        highestRatedPromises.push(fetchHighestRatedMovies(page));
      }

      // Fetch multiple pages for each genre
      genres.forEach((genre) => {
        for (let i = 0; i < pagesToFetch; i++) {
          let page = genrePages[genre.id] + i;
          if (page > MAX_PAGE) {
            page = 1;
          }
          genrePromises.push(fetchMoviesByGenre(genre.id, page));
        }
      });

      const [
        topRatedResponses,
        highestRatedResponses,
        genreResponses,
      ] = await Promise.all([
        Promise.all(topRatedPromises),
        Promise.all(highestRatedPromises),
        Promise.all(genrePromises),
      ]);

      // Process responses
      const topRatedMovies = flattenAndFilterResponses(topRatedResponses);
      const highestRatedMovies = flattenAndFilterResponses(highestRatedResponses);
      const genreMovies = flattenAndFilterResponses(genreResponses);

      // Combine and shuffle movies
      const newMovies = shuffleArray([
        ...topRatedMovies,
        ...highestRatedMovies,
        ...genreMovies,
      ]);

      // Update state
      setMovies((prevMovies) => [...prevMovies, ...newMovies]);

      // Update displayed movie IDs
      newMovies.forEach((movie) => displayedMovieIds.current.add(movie.id));

      // Update pages
      let newTopRatedPage = topRatedPage + pagesToFetch;
      if (newTopRatedPage > MAX_PAGE) {
        newTopRatedPage = 1;
      }
      setTopRatedPage(newTopRatedPage);

      let newHighestRatedPage = highestRatedPage + pagesToFetch;
      if (newHighestRatedPage > MAX_PAGE) {
        newHighestRatedPage = 1;
      }
      setHighestRatedPage(newHighestRatedPage);

      const newGenrePages = { ...genrePages };
      genres.forEach((genre) => {
        let newPage = newGenrePages[genre.id] + pagesToFetch;
        if (newPage > MAX_PAGE) {
          newPage = 1;
        }
        newGenrePages[genre.id] = newPage;
      });
      setGenrePages(newGenrePages);
    } catch (error) {
      console.error('Error fetching more movies:', error);
      Alert.alert('Error', 'Failed to load more movies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const flattenAndFilterResponses = (responses: any[]) => {
    const moviesArray: Movie[] = [];
    responses.forEach((response) => {
      if (response && response.results) {
        const filteredMovies = filterNewMovies(response.results);
        moviesArray.push(...filteredMovies);
      }
    });
    return moviesArray;
  };

  const filterNewMovies = (moviesArray: Movie[]) => {
    return moviesArray.filter((movie) => {
      if (movie.poster_path && !displayedMovieIds.current.has(movie.id)) {
        return true;
      }
      return false;
    });
  };

  const shuffleArray = (array: Movie[]): Movie[] => {
    return array.sort(() => Math.random() - 0.5);
  };

  if (loading && movies.length === 0) {
    // Show loading indicator only if no movies are loaded yet
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
        renderCard={(movie) => {
          if (!movie) {
            return null; // Avoid rendering if movie is undefined
          }
          return (
            <FlipCard
              movie={movie}
              setSwipingEnabled={setSwipingEnabled}
            />
          );
        }}
        infinite={false}
        backgroundColor="transparent"
        cardVerticalMargin={10}
        stackSize={3}
        stackSeparation={15}
        onSwipedAll={fetchMoreMovies}
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
        disableTopSwipe={true} // Disable up swipe
        disableBottomSwipe={!swipingEnabled}
        disableLeftSwipe={!swipingEnabled}
        disableRightSwipe={!swipingEnabled}
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Dark background
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000', // Dark background
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
  },
});

export default CineBrowseScreen;
