////////////////////////////////////////////////////////////////////////////////
// CineBrowseScreen.tsx
////////////////////////////////////////////////////////////////////////////////
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
  Text,
  Image,
  Animated,
  Keyboard,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import FlipCard from '../components/FlipCard';
import { Movie } from '../services/api';
import { auth, db } from '../firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { DIMS, getCardHeight } from '../theme';
import { fetchMoviesByCategory, searchMoviesAndShows } from '../services/tmdb';
import PerformanceLogger from '../utils/performanceLogger';
import GlossySearchBar from '../components/GlossySearchBar';
import SearchModal from '../components/SearchModal';
import { useFonts } from 'expo-font';

const { width, height } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 100;
const SCREEN_HEIGHT = height - TAB_BAR_HEIGHT;

const NEXT_CARD_SCALE = 1; // Changed to 1 for perfect overlap
const NEXT_CARD_OPACITY = 1; // Changed to 1 for perfect overlap
const TRANSITION_DURATION = 150; // Shorter animation duration for snappier feel

const movieCache = {
  data: new Map<string, Movie[]>(),
  timestamp: new Map<string, number>(),
  CACHE_DURATION: 5 * 60 * 1000,
};

type RootStackParamList = {
  CineBrowse: undefined;
  MovieReview: { movie: Movie };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'CineBrowse'>;

const CineBrowseScreen: React.FC = () => {
  const [fontsLoaded] = useFonts({
    'Inter-Bold': require('../../assets/fonts/Inter-Bold.ttf'),
  });

  const navigation = useNavigation<NavigationProp>();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [swipingEnabled, setSwipingEnabled] = useState(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [backgroundCards, setBackgroundCards] = useState<Movie[]>([]);
  const displayedMovieIds = useRef<Set<number>>(new Set());
  const [errorCount, setErrorCount] = useState(0);
  const MAX_ERROR_ATTEMPTS = 3;

  const swipeAnimatedValue = useRef(new Animated.Value(0)).current;
  const swipeDirectionRef = useRef<'left' | 'right' | null>(null);
  const debouncedFetch = useRef<any>(null);

  const BATCH_SIZE = 20;
  const memoizedBackgroundCards = useMemo(
    () => backgroundCards.slice(0, 3),
    [backgroundCards]
  );
  const [preloadedCards, setPreloadedCards] = useState<Movie[]>([]);

  const preloadNextCards = useCallback(
    (currIndex: number) => {
      PerformanceLogger.start('preloadNextCards');
      const nextCards = movies.slice(currIndex, currIndex + 5);
      setPreloadedCards(nextCards);
      
      // Preload images using Image.prefetch
      nextCards.forEach(movie => {
        if (movie?.poster_path) {
          Image.prefetch(`https://image.tmdb.org/t/p/w500${movie.poster_path}`);
        }
      });
      
      PerformanceLogger.end('preloadNextCards');
    },
    [movies]
  );

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounceRef = useRef<NodeJS.Timeout>();
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);

  const handleMovieSelect = useCallback((selectedMovie: Movie) => {
    if (!selectedMovie) return;
    
    setMovies(prevMovies => {
      // Check if movie already exists in the array
      const exists = prevMovies.some(movie => movie.id === selectedMovie.id);
      if (exists) return prevMovies;
      
      // Add the selected movie to the beginning of the array
      return [selectedMovie, ...prevMovies];
    });
    
    setCurrentIndex(0); // Reset to show the newly added movie
    setIsSearchModalVisible(false); // Close search modal if open
  }, []);

  const renderBackground = () => {
    const imagePath = backgroundImage || movies[currentIndex]?.poster_path;
    if (!imagePath) return null;
    
    return (
      <View style={styles.fullScreenBackground}>
        <Animated.Image
          source={{
            uri: `https://image.tmdb.org/t/p/w500${imagePath}`,
          }}
          style={[
            styles.backgroundImage,
            {
              opacity: swipeAnimatedValue.interpolate({
                inputRange: [-width/2, 0, width/2],
                outputRange: [0.5, 1, 0.5],
                extrapolate: 'clamp',
              }),
            }
          ]}
          blurRadius={15}
        />
        <View style={styles.backgroundOverlay} />
      </View>
    );
  };

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      if (text.trim()) {
        setIsFetching(true);
        try {
          const results = await searchMoviesAndShows(text);
          if (results?.length) {
            setMovies(results);
            setCurrentIndex(0);
          }
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsFetching(false);
        }
      } else {
        handleRefresh();
      }
    }, 500);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    handleRefresh();
  }, []);

  const handleSearchBarPress = () => {
    setIsSearchModalVisible(true);
  };

  const fetchMoreMovies = async () => {
    if (isFetching || errorCount >= MAX_ERROR_ATTEMPTS) return;

    console.log('Fetching movies...', { currentPage, isFetching });
    PerformanceLogger.start('fetchMoreMovies');
    
    try {
      setIsFetching(true);
      const cacheKey = `page_${currentPage}`;
      const now = Date.now();

      // Check cache first
      if (
        movieCache.data.has(cacheKey) &&
        now - movieCache.timestamp.get(cacheKey)! < movieCache.CACHE_DURATION
      ) {
        console.log('Using cached data for', cacheKey);
        const cachedData = movieCache.data.get(cacheKey)!;
        appendMovies(cachedData);
        setIsFetching(false);
        return;
      }

      // Fetch new data
      const response = await fetchMoviesByCategory(currentPage, {
        batchSize: BATCH_SIZE,
      });

      if (!response?.results?.length) {
        throw new Error('No results returned');
      }

      const newMovies = response.results
        .filter((m: Movie) => !displayedMovieIds.current.has(m.id))
        .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

      // Update cache
      movieCache.data.set(cacheKey, newMovies);
      movieCache.timestamp.set(cacheKey, now);

      // Update state
      appendMovies(newMovies);
      setBackgroundCards((prev) => [...prev, ...newMovies.slice(0, 3)]);
      newMovies.forEach((movie: Movie) => displayedMovieIds.current.add(movie.id));
      setCurrentPage((prev) => prev + 1);

    } catch (error) {
      console.error('Error fetching more movies:', error);
      setErrorCount((prev) => prev + 1);
    } finally {
      setIsFetching(false);
      PerformanceLogger.end('fetchMoreMovies');
    }
  };

  const appendMovies = useCallback((newMovies: Movie[]) => {
    if (!Array.isArray(newMovies) || newMovies.length === 0) {
      console.log('No new movies to append');
      return;
    }
    
    setMovies((prevMovies) => {
      const uniqueNewMovies = newMovies.filter(
        (movie) => !prevMovies.some((existing) => existing.id === movie.id)
      );
      return [...prevMovies, ...uniqueNewMovies];
    });
  }, []);

  const handleRefresh = async () => {
    setCurrentPage(1);
    setMovies([]);
    displayedMovieIds.current.clear();
    await fetchMoreMovies();
  };

  // Add useEffect to fetch movies on mount
  useEffect(() => {
    fetchMoreMovies();
  }, []);

  const renderCard = useCallback((movie: Movie) => {
    if (!movie) return null;
    
    return (
      <View style={styles.cardContainer}>
        <FlipCard 
          movie={movie}
          onSwipingStateChange={setSwipingEnabled}
        />
      </View>
    );
  }, []);

  // Add these swipe handlers
  const handleSwiped = useCallback((index: number) => {
    setCurrentIndex(index + 1);
    if (movies.length - (index + 1) <= 5) {
      fetchMoreMovies();
    }
  }, [movies.length]);

  const handleSwipedLeft = (index: number) => {
    // Optional: handle left swipe
  };

  const handleSwipedRight = async (index: number) => {
    const movie = movies[index];
    if (movie) {
      try {
        const userRef = doc(db, 'users', auth.currentUser?.uid);
        const movieRef = doc(collection(userRef, 'movies'), movie.id.toString());
        await setDoc(movieRef, {
          ...movie,
          category: 'watched',
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Error saving movie:', error);
      }
    }
  };

  const handleSwipedTop = async (index: number) => {
    const movie = movies[index];
    if (movie) {
      try {
        const userRef = doc(db, 'users', auth.currentUser?.uid);
        const movieRef = doc(collection(userRef, 'movies'), movie.id.toString());
        await setDoc(movieRef, {
          ...movie,
          category: 'most_watch',
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Error saving movie:', error);
      }
    }
  };

  const handleSwipedBottom = async (index: number) => {
    const movie = movies[index];
    if (movie) {
      try {
        const userRef = doc(db, 'users', auth.currentUser?.uid);
        const movieRef = doc(collection(userRef, 'movies'), movie.id.toString());
        await setDoc(movieRef, {
          ...movie,
          category: 'watch_later',
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Error saving movie:', error);
      }
    }
  };

  return (
    <View style={styles.mainContainer}>
      {renderBackground()}
      <View style={styles.contentLayer}>
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>INCLIVO</Text>
        </View>
        
        <View style={styles.contentContainer}>
          {isFetching && movies.length === 0 ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loaderText}>Loading movies...</Text>
            </View>
          ) : movies.length === 0 ? (
            <View style={styles.loaderContainer}>
              <Text style={styles.loaderText}>No movies found</Text>
            </View>
          ) : (
            <View style={styles.swiperContainer}>
              <Swiper
                cards={movies}
                renderCard={renderCard}
                cardIndex={currentIndex}
                backgroundColor="transparent"
                stackSize={2}
                infinite={false}
                animateCardOpacity={true}
                cardHorizontalMargin={0}
                cardVerticalMargin={0}
                onSwiped={handleSwiped}
                onSwipedLeft={handleSwipedLeft}
                onSwipedRight={handleSwipedRight}
                onSwipedTop={handleSwipedTop}
                onSwipedBottom={handleSwipedBottom}
                containerStyle={styles.swiperWrapper}
                cardStyle={styles.swiperCard}
                stackSeparation={0}
                verticalSwipe={swipingEnabled}
                horizontalSwipe={swipingEnabled}
                overlayLabels={{
                  left: {
                    title: 'NOPE',
                    style: {
                      label: {
                        backgroundColor: 'red',
                        color: '#fff',
                      },
                    },
                  },
                  right: {
                    title: 'LIKE',
                    style: {
                      label: {
                        backgroundColor: '#4CCC93',
                        color: '#fff',
                      },
                    },
                  },
                }}
              />
            </View>
          )}
        </View>

        <View style={styles.bottomSearchContainer}>
          <GlossySearchBar
            value={searchQuery}
            onChangeText={handleSearch}
            onClear={clearSearch}
            onMovieSelect={handleMovieSelect}
            style={styles.searchBar}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#000', // Set black background
  },

  contentLayer: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  titleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 10,
    zIndex: 10,
  },
  
  titleText: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  swiperContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  swiperWrapper: {
    backgroundColor: 'transparent',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  swiperCard: {
    width: DIMS.cardWidth,
    height: getCardHeight(),
  },

  bottomSearchContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 70,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 100,
  },

  searchBar: {
    width: '100%',
  },

  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loaderText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },

  cardContainer: {
    width: DIMS.cardWidth,
    height: getCardHeight(),
    alignSelf: 'center',
    justifyContent: 'center',
  },

  fullScreenBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },

  backgroundImage: {
    width: '100%',
    height: '100%',
    opacity: 0.5,
  },

  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },

  // ...rest of existing styles...
});

export default CineBrowseScreen;