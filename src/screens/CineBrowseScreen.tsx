// src/screens/CineBrowseScreen.tsx

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  Dimensions, 
  Platform, 
  Text,
  Animated // Add this import
} from 'react-native';
import Swiper from 'react-native-deck-swiper';
import FlipCard from '../components/FlipCard';
import { Ionicons } from '@expo/vector-icons'; // Add this import
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  fetchTopRatedMovies,
  fetchMoviesByGenre,
  fetchHighestRatedMovies,
} from '../services/tmdb';
import { TapGestureHandler, State } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 67; // Match new tab bar height
const SCREEN_HEIGHT = Platform.select({
  ios: height - TAB_BAR_HEIGHT - (Platform.OS === 'ios' ? 44 : 0), // Account for iOS status bar
  android: height - TAB_BAR_HEIGHT,
});

interface Genre {
  label: string;
  id: number;
}

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  overview: string;
  release_date: string;
  runtime: number;
  genres: { id: number; name: string }[];
  // Add other detailed fields if needed
}

const genres: Genre[] = [
  { label: 'Action', id: 28 },
  { label: 'Adventure', id: 12 },
  // ... (rest of the genres)
];

const MAX_PAGE = 500; // Maximum page number allowed by TMDB API

// Add type for navigation
type RootStackParamList = {
  CineBrowse: undefined;
  MovieReview: { movie: Movie };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'CineBrowse'>;

const CineBrowseScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
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

  const handleSwipedRight = (index: number) => {
    console.log('Seen movie:', movies[index]);
    // Just log for now, remove addMovieToList
  };

  const handleSwipedLeft = (index: number) => {
    
  };

  const handleSwipedTop = (index: number) => {
    console.log('Most Watch movie:', movies[index]);
    // Just log for now, remove addMovieToList
  };

  const handleSwipedBottom = (index: number) => {
    console.log('Watch Later movie:', movies[index]);
    // Just log for now, remove addMovieToList
  };

  const handleMovieReview = (movie: Movie) => {
    navigation.navigate('MovieReview', { movie });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Swiper
          cards={movies}
          renderCard={(movie) => {
            if (!movie) return null;
            return (
              <FlipCard
                movie={movie}
                onSwipingStateChange={setSwipingEnabled}
              />
            );
          }}
          infinite={false}
          backgroundColor="transparent"
          cardVerticalMargin={0}
          cardHorizontalMargin={0}
          stackSize={3}
          stackScale={10}
          stackSeparation={14}
          overlayOpacityHorizontalThreshold={width / 8} // Reduced from width/6
          overlayOpacityVerticalThreshold={SCREEN_HEIGHT / 8} // Reduced from SCREEN_HEIGHT/6
          inputRotationRange={[-width / 2, 0, width / 2]}  // Add this for better rotation
          outputRotationRange={["-10deg", "0deg", "10deg"]}  // Add this for better rotation
          onSwipedAll={fetchMoreMovies}
          onSwipedTop={handleSwipedTop}
          onSwipedBottom={handleSwipedBottom}
          onSwipedRight={handleSwipedRight}
          onSwipedLeft={handleSwipedLeft}
          verticalSwipe={swipingEnabled}
          horizontalSwipe={swipingEnabled}
          disableTopSwipe={!swipingEnabled}
          disableBottomSwipe={!swipingEnabled}
          disableLeftSwipe={!swipingEnabled}
          disableRightSwipe={!swipingEnabled}
          verticalThreshold={SCREEN_HEIGHT / 6}  // Reduced from SCREEN_HEIGHT/4
          horizontalThreshold={width / 6}  // Reduced from width/4
          useViewOverflow={false}
          preventSwiping={['up', 'down', 'left', 'right']} // Add this line
          swipeBackCard={false} // Add this line
          overlayLabels={swipingEnabled ? {
            left: {
              element: (
                <View style={[styles.overlayWrapper, { borderColor: '#FF4B4B' }]}>
                  <Ionicons name="close-circle" size={40} color="#FF4B4B" />
                  <Text style={[styles.overlayText, { color: '#FF4B4B' }]}>Not Watched</Text>
                </View>
              )
            },
            right: {
              element: (
                <View style={[styles.overlayWrapper, { borderColor: '#4BFF4B' }]}>
                  <Ionicons name="checkmark-circle" size={40} color="#4BFF4B" />
                  <Text style={[styles.overlayText, { color: '#4BFF4B' }]}>Watched</Text>
                </View>
              )
            },
            top: {
              element: (
                <View style={[styles.overlayWrapper, { borderColor: '#FFD700' }]}>
                  <Ionicons name="repeat" size={40} color="#FFD700" />
                  <Text style={[styles.overlayText, { color: '#FFD700' }]}>Most Watch</Text>
                </View>
              )
            },
            bottom: {
              element: (
                <View style={[styles.overlayWrapper, { borderColor: '#00BFFF' }]}>
                  <Ionicons name="time" size={40} color="#00BFFF" />
                  <Text style={[styles.overlayText, { color: '#00BFFF' }]}>Watch Later</Text>
                </View>
              )
            },
          } : undefined}
          swipeAnimationDuration={swipingEnabled ? 350 : 0}
          animateCardOpacity={true}
          containerStyle={styles.swiperContainer}
          cardStyle={styles.cardStyle}
        />
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
};

// Add these new styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center', // Center horizontally
    justifyContent: 'center', // Center vertically
  },
  swiperContainer: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: width,
    height: SCREEN_HEIGHT,
  },
  cardStyle: {
    top: 0,
    left: 0,
    alignSelf: 'center',
    justifyContent: 'center',
    margin: 0,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,                    // Take up all available space
    backgroundColor: '#000',    // Black background for loading screen
    justifyContent: 'center',   // Center loading spinner vertically
    alignItems: 'center',       // Center loading spinner horizontally
  },
  loadingOverlay: {
    position: 'absolute',       // Position over other content
    top: '50%',                // Center vertically
    alignSelf: 'center',       // Center horizontally
  },
  overlayWrapper: {
    position: 'absolute',
    top: '50%',  // Center vertically
    left: '50%', // Center horizontally
    transform: [{ translateX: -75 }, { translateY: -50 }], // Offset by half the size
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black background
    borderWidth: 2,
    borderRadius: 15,
    width: 150,
    height: 100,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  overlayText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default CineBrowseScreen;
