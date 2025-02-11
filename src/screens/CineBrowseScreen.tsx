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
import SearchDrawer from '../components/SearchDrawer';

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
  const [isSearchDrawerVisible, setIsSearchDrawerVisible] = useState(false);

  const swiperRef = useRef<any>(null);

  const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const [isSearchMode, setIsSearchMode] = useState(false);

  const handleMovieSelect = useCallback((selectedMovie: Movie) => {
    if (!selectedMovie) return;

    setIsSearchMode(true); // Set search mode when selecting from search
    setMovies([]);
    displayedMovieIds.current.clear(); // Clear the cache
    
    // Create complete movie object
    const completeMovie = {
      id: selectedMovie.id,
      title: selectedMovie.title || selectedMovie.name || '',
      name: selectedMovie.name || selectedMovie.title || '',
      poster_path: selectedMovie.poster_path || null,
      backdrop_path: selectedMovie.backdrop_path || null,
      vote_average: selectedMovie.vote_average || 0,
      overview: selectedMovie.overview || '',
      release_date: selectedMovie.release_date || selectedMovie.first_air_date || '',
      first_air_date: selectedMovie.first_air_date || selectedMovie.release_date || '',
      media_type: selectedMovie.media_type || 'movie',
      vote_count: selectedMovie.vote_count || 0,
      genres: selectedMovie.genres || [],
      popularity: selectedMovie.popularity || 0
    };

    // Pre-fetch images before updating state
    const imagesToPreload = [
      completeMovie.poster_path,
      completeMovie.backdrop_path,
    ].filter(Boolean);

    Promise.all(
      imagesToPreload.map(path =>
        Image.prefetch(`https://image.tmdb.org/t/p/w500${path}`)
      )
    ).then(() => {
      // Update background
      setBackgroundImage(completeMovie.poster_path || completeMovie.backdrop_path);
      
      // Set only the selected movie
      setMovies([completeMovie]);
      setCurrentIndex(0);
      
      // Reset swiper position
      if (swiperRef.current) {
        swiperRef.current.jumpToCardIndex(0);
      }

      // Reset the movie stack
      setTimeout(() => {
        setCurrentPage(1); // Reset to page 1
        setIsSearchMode(false); // Exit search mode
        movieCache.data.clear(); // Clear the entire cache
        displayedMovieIds.current.clear(); // Clear displayed IDs
        fetchMoreMovies(); // Fetch fresh movies
      }, 500);
    });

    // Close drawer
    setIsSearchDrawerVisible(false);
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

    try {
      setIsFetching(true);

      // If in search mode, don't fetch more movies
      if (isSearchMode) {
        setIsFetching(false);
        return;
      }

      // Get 3 random pages between 1 and 20 for better variety
      const randomPages = Array.from({ length: 3 }, () => 
        Math.floor(Math.random() * 20) + 1
      );

      const allMovies = await Promise.all(
        randomPages.map(page => 
          fetchMoviesByCategory(page, { batchSize: BATCH_SIZE })
        )
      );

      let newMovies = allMovies
        .flatMap(response => response.results || [])
        .filter((m: Movie) => {
          const isDuplicate = displayedMovieIds.current.has(m.id) ||
            movies.some(existing => existing.id === m.id);
          return !isDuplicate && m.poster_path; // Ensure movie has poster
        });

      // Shuffle and limit
      newMovies = shuffleArray(newMovies).slice(0, BATCH_SIZE);

      // Update state with new movies
      if (newMovies.length > 0) {
        appendMovies(newMovies);
        newMovies.forEach(movie => displayedMovieIds.current.add(movie.id));
      }

    } catch (error) {
      console.error('Error fetching more movies:', error);
      setErrorCount(prev => prev + 1);
    } finally {
      setIsFetching(false);
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
    
    // Check if we need to fetch more movies
    const remainingCards = movies.length - (index + 1);
    if (remainingCards <= 5 && !isSearchMode) {
      fetchMoreMovies();
    }
  }, [movies.length, isSearchMode]);

  const saveMovieToFirebase = async (movie: Movie, category: string) => {
    if (!movie || !auth.currentUser) return;
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const movieRef = doc(collection(userRef, 'movies'), movie.id.toString());
      
      // Get current date in YYYY-MM-DD format as fallback
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Create consistent movie data structure
      const movieData = {
        id: movie.id,
        title: movie.title || movie.name || 'Unknown Title',
        poster_path: movie.poster_path || null,
        backdrop_path: movie.backdrop_path || null,
        overview: movie.overview || '',
        vote_average: parseFloat((movie.vote_average || 0).toFixed(1)),
        release_date: currentDate,
        category: category || 'uncategorized',
        timestamp: new Date().toISOString(),
        userId: auth.currentUser.uid,
        media_type: movie.media_type || 'movie',
        vote_count: movie.vote_count || 0
      };

      // Determine the correct release date
      if (movie.media_type === 'tv' && movie.first_air_date) {
        movieData.release_date = movie.first_air_date;
      } else if (movie.release_date) {
        movieData.release_date = movie.release_date;
      }

      await setDoc(movieRef, movieData);
      console.log('Successfully saved movie:', movieData.title);
    } catch (error) {
      console.error('Error saving movie:', error);
    }
  };

  const handleSwipedLeft = async (index: number) => {
    await saveMovieToFirebase(movies[index], 'not_watched');
  };

  const handleSwipedRight = async (index: number) => {
    await saveMovieToFirebase(movies[index], 'watched');
  };

  const handleSwipedTop = async (index: number) => {
    await saveMovieToFirebase(movies[index], 'most_watch');
  };

  const handleSwipedBottom = async (index: number) => {
    await saveMovieToFirebase(movies[index], 'watch_later');
  };

  const renderBottomSearchBar = () => (
    <TouchableOpacity
      style={styles.bottomSearchContainer}
      onPress={() => setIsSearchDrawerVisible(true)}
    >
      <View style={styles.searchBarPlaceholder}>
        <Ionicons name="search" size={24} color="#666" />
        <Text style={styles.searchBarPlaceholderText}>
          Search movies & TV shows...
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.mainContainer}>
      {renderBackground()}
      <View style={styles.contentLayer}>
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>INCLIVO</Text>
        </View>
        
        <View style={styles.swiperContainer}>
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
            <Swiper
              ref={swiperRef}
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
              stackSeparation={0}
              verticalSwipe={swipingEnabled}
              horizontalSwipe={swipingEnabled}
            />
          )}
        </View>

        {renderBottomSearchBar()}
      </View>

      <SearchDrawer
        isVisible={isSearchDrawerVisible}
        onClose={() => setIsSearchDrawerVisible(false)}
        onMovieSelect={handleMovieSelect}
        style={{ zIndex: 999 }} // Add this for extra safety
      />
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // Ensure it's below the search drawer
  },

  swiperWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },

  swiperCard: {
    width: DIMS.cardWidth,
    height: getCardHeight(),
  },

  bottomSearchContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 75 : 75,
    left: 16,
    right: 16,
    zIndex: 50,
  },

  searchBarPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  searchBarPlaceholderText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    marginLeft: 10,
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
    position: 'absolute',
    left: '50%',
    top: '48%',
    transform: [
      { translateX: -DIMS.cardWidth / 2 },
      { translateY: -getCardHeight() / 2 }
    ],
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