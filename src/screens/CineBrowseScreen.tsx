// src/screens/CineBrowseScreen.tsx

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Dimensions, Platform, Text, Image, Animated } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import FlipCard from '../components/FlipCard';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Movie } from '../services/api';
import { fetchRandomMovies, shuffleArray } from '../services/helper';
import { auth, db } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import FilterCard from '../components/FilterCard';
import { DIMS, getCardHeight } from '../theme';
import { fetchMoviesByCategory } from '../services/tmdb'; // Update imports

const { width, height } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 67; // Match new tab bar height
const HEADER_HEIGHT = Platform.OS === 'ios' ? 44 : 56; // Standard header heights
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 0;
const SCREEN_HEIGHT = height - TAB_BAR_HEIGHT - HEADER_HEIGHT - STATUS_BAR_HEIGHT;

const NEXT_CARD_SCALE = 0.92;
const NEXT_CARD_OPACITY = 0.5;

interface Genre {
  label: string;
  id: number;
}

const genres: Genre[] = [
  { label: 'Action', id: 28 },
  { label: 'Adventure', id: 12 },
  // ... (rest of the genres)
];

const MAX_PAGE = 500; // Maximum page number allowed by TMDB API

type RootStackParamList = {
  CineBrowse: undefined;
  MovieReview: { movie: Movie };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'CineBrowse'>;

// Update the categories array
const defaultCategories = [
  'All',
  'TV Shows',
  'Animated',
  'Japan',
  'France'

  
];

const CineBrowseScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [swipingEnabled, setSwipingEnabled] = useState(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [backgroundCards, setBackgroundCards] = useState<Movie[]>([]);
  const [categoryMovies, setCategoryMovies] = useState<{ [key: string]: Movie[] }>({});
  const [categoryPages, setCategoryPages] = useState<{ [key: string]: number }>({});
  const [categoryTotalPages, setCategoryTotalPages] = useState<{ [key: string]: number }>({});

  const displayedMovieIds = useRef<Set<number>>(new Set());

  const initialGenrePages: { [key: number]: number } = {};
  genres.forEach((genre) => {
    initialGenrePages[genre.id] = 1;
  });
  const [genrePages, setGenrePages] = useState<{ [key: number]: number }>(initialGenrePages);

  const [topRatedPage, setTopRatedPage] = useState(1);
  const [highestRatedPage, setHighestRatedPage] = useState(1);

  const [errorCount, setErrorCount] = useState(0);
  const MAX_ERROR_ATTEMPTS = 3;
  const MAX_RETRIES = 5;
  const retryTimeout = useRef<NodeJS.Timeout>();
  const [isChangingCategory, setIsChangingCategory] = useState(false);
  const previousCategory = useRef<string>('');

  const swipeAnimatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchMoreMovies();
  }, []);

  // Add focus listener for screen refresh
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      handleRefresh();
    });

    return unsubscribe;
  }, [navigation]);

  const handleRefresh = async () => {
    setCurrentPage(1);
    setMovies([]);
    displayedMovieIds.current.clear();
    await fetchMoreMovies();
  };

  // Update fetchMoreMovies to handle background cards
  const fetchMoreMovies = async (retryCount = 0) => {
    if (isFetching || errorCount >= MAX_ERROR_ATTEMPTS) return;
    
    try {
      setIsFetching(true);
      const currentCategoryPage = categoryPages[selectedCategory] || 1;
      const totalPages = categoryTotalPages[selectedCategory];

      // Reset error count on successful attempt
      setErrorCount(0);

      // Check if we've reached the end of available pages
      if (totalPages && currentCategoryPage > totalPages) {
        console.log('Reached end of pages for category:', selectedCategory);
        if (selectedCategory !== 'All') {
          handleCategorySelect('All');
        }
        return;
      }
      
      const response = await fetchMoviesByCategory(
        selectedCategory, 
        currentCategoryPage
      );
      
      if (!response?.results?.length) {
        throw new Error('No results returned');
      }

      const newMovies = response.results.filter(
        movie => !displayedMovieIds.current.has(movie.id)
      );

      if (newMovies.length === 0 && retryCount < MAX_RETRIES) {
        // Try next page if no new movies found
        setCategoryPages(prev => ({
          ...prev,
          [selectedCategory]: currentCategoryPage + 1
        }));
        return fetchMoreMovies(retryCount + 1);
      }

      setMovies(prevMovies => [...prevMovies, ...newMovies]);
      setBackgroundCards(prevCards => [...prevCards, ...newMovies]);
      newMovies.forEach(movie => displayedMovieIds.current.add(movie.id));
      
      setCategoryPages(prev => ({
        ...prev,
        [selectedCategory]: currentCategoryPage + 1
      }));

      if (response.total_pages) {
        setCategoryTotalPages(prev => ({
          ...prev,
          [selectedCategory]: response.total_pages
        }));
      }

    } catch (error) {
      console.error('Error fetching more movies:', error);
      setErrorCount(prev => prev + 1);
      
      if (retryCount < MAX_RETRIES) {
        // Clear any existing retry timeout
        if (retryTimeout.current) {
          clearTimeout(retryTimeout.current);
        }
        
        // Retry after delay
        retryTimeout.current = setTimeout(() => {
          fetchMoreMovies(retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
      } else if (selectedCategory !== 'All') {
        handleCategorySelect('All');
      }
    } finally {
      setIsFetching(false);
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

  const saveMovieToFirestore = async (movie: Movie, category: string) => {
    if (!auth.currentUser || !movie) {
      console.warn('No user logged in or invalid movie data');
      return;
    }
  
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const movieRef = doc(collection(userRef, 'movies'), movie.id.toString());
  
      // First, check if the movie already exists
      const movieDoc = await getDoc(movieRef);
      if (movieDoc.exists()) {
        console.log('Movie already saved');
        return;
      }
  
      // Normalize the data before saving
      const mediaData = {
        movieId: movie.id.toString(),
        title: movie.title || movie.name, // Handle both movies and TV shows
        poster_path: movie.poster_path || null,
        media_type: movie.media_type || 'movie',
        category,
        timestamp: new Date()
      };
  
      if (movie.id && (movie.title || movie.name)) {
        await setDoc(movieRef, mediaData);
      } else {
        console.warn('Missing required fields:', movie);
      }
    } catch (error) {
      console.error('Error saving movie:', error);
    }
  };

  const handleSwipedRight = async (index: number) => {
    const movie = movies[index];
    if (movie) {
      await saveMovieToFirestore(movie, 'watched');
    }
  };

  const handleSwipedLeft = (index: number) => {
    
  };

  const handleSwipedTop = async (index: number) => {
    const movie = movies[index];
    if (movie) {
      await saveMovieToFirestore(movie, 'most_watch');
    }
  };

  const handleSwipedBottom = async (index: number) => {
    const movie = movies[index];
    if (movie) {
      await saveMovieToFirestore(movie, 'watch_later');
    }
  };

  const handleMovieReview = (movie: Movie) => {
    navigation.navigate('MovieReview', { movie });
  };

  const handleSwiped = (index: number) => {
    setCurrentIndex(index + 1);
    
    // Pre-fetch more cards when we're running lower
    if (movies.length - (index + 1) <= 15) {
      fetchMoreMovies();
    }
  };

  // Update handleCategorySelect to reset pagination state
  const handleCategorySelect = async (category: string) => {
    if (category === selectedCategory || isChangingCategory) return;

    setIsChangingCategory(true);
    previousCategory.current = selectedCategory;
    setSelectedCategory(category);
    setCurrentPage(1);
    
    try {
      // Keep old cards visible while loading new ones
      const response = await fetchMoviesByCategory(category, 1);
      
      if (response?.results?.length) {
        setMovies(response.results);
        setBackgroundCards(response.results.slice(1));
        displayedMovieIds.current.clear();
        response.results.forEach(movie => displayedMovieIds.current.add(movie.id));
        
        // Pre-fetch next batch
        const nextBatch = await fetchMoviesByCategory(category, 2);
        if (nextBatch?.results) {
          setMovies(prev => [...prev, ...nextBatch.results]);
          setBackgroundCards(prev => [...prev, ...nextBatch.results]);
          nextBatch.results.forEach(movie => displayedMovieIds.current.add(movie.id));
        }
      } else {
        throw new Error('No results for category');
      }
    } catch (error) {
      console.error('Error changing category:', error);
      // Revert to previous category on error
      setSelectedCategory(previousCategory.current);
    } finally {
      setCurrentPage(prev => prev + 1);
      setIsChangingCategory(false);
    }
  };

  const renderBackgroundCard = (index: number) => {
    const nextMovie = movies[index + 1];
    if (!nextMovie?.poster_path) return null;
    
    return (
      <Image
        source={{ 
          uri: `https://image.tmdb.org/t/p/w500${nextMovie.poster_path}` 
        }}
        style={[styles.blurredCard, { opacity: 0.3 }]}
        blurRadius={20}
        resizeMode="cover"
      />
    );
  };

  const filterMoviesByCategory = async (category: string) => {
    try {
      setMovies([]);
      displayedMovieIds.current.clear();

      const response = await fetchMoviesByCategory(category, 1);
      
      if (response?.results) {
        setMovies(response.results);
        response.results.forEach(movie => 
          displayedMovieIds.current.add(movie.id)
        );
      }
    } catch (error) {
      console.error('Error filtering movies:', error);
      // Fallback to all movies if category fetch fails
      const fallback = await fetchMoviesByCategory('all', 1);
      setMovies(fallback.results || []);
    }
  };

  const calculateNextCardStyle = (index: number) => {
    if (index !== currentIndex + 1) return {};

    const scale = swipeAnimatedValue.interpolate({
      inputRange: [-width, 0, width],
      outputRange: [1, NEXT_CARD_SCALE, 1],
      extrapolate: 'clamp'
    });

    const opacity = swipeAnimatedValue.interpolate({
      inputRange: [-width, 0, width],
      outputRange: [1, NEXT_CARD_OPACITY, 1],
      extrapolate: 'clamp'
    });

    const translateY = swipeAnimatedValue.interpolate({
      inputRange: [-width, 0, width],
      outputRange: [0, 20, 0],
      extrapolate: 'clamp'
    });

    return {
      transform: [{ scale }, { translateY }],
      opacity
    };
  };

  // Update Swiper component render
  return (
    <View style={styles.mainContainer}>
      <View style={styles.filterContainer}>
        <FilterCard
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
          categories={defaultCategories}
        />
      </View>
      <GestureHandlerRootView style={styles.gestureContainer}>
        <View style={styles.container}>
          <Swiper
            cards={movies}
            renderCard={(movie, index) => {
              if (!movie) return null;
              const isNextCard = index === currentIndex + 1;
              
              return (
                <Animated.View 
                  style={[
                    styles.cardContainer,
                    isNextCard && calculateNextCardStyle(index)
                  ]}
                >
                  {isNextCard && (
                    <View style={styles.nextCardOverlay}>
                      <Image
                        source={{ 
                          uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
                        }}
                        style={styles.nextCardBackground}
                        blurRadius={10}
                      />
                    </View>
                  )}
                  <FlipCard
                    movie={movie}
                    onSwipingStateChange={setSwipingEnabled}
                  />
                </Animated.View>
              );
            }}
            onSwiping={(x: number) => {
              swipeAnimatedValue.setValue(x);
            }}
            onSwipeStart={() => {
              swipeAnimatedValue.setValue(0);
            }}
            onSwipeEnd={() => {
              Animated.timing(swipeAnimatedValue, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true
              }).start();
            }}
            infinite={false}
            backgroundColor="transparent"
            cardVerticalMargin={0}
            cardHorizontalMargin={0}
            stackSize={3}
            stackScale={10}
            stackSeparation={-30}
            overlayOpacityHorizontalThreshold={width / 8}
            overlayOpacityVerticalThreshold={SCREEN_HEIGHT / 8}
            inputRotationRange={[-width / 2, 0, width / 2]}
            outputRotationRange={["-10deg", "0deg", "10deg"]}
            onSwipedAll={() => {
              fetchMoreMovies();
              setCurrentIndex(0);
            }}
            onSwipedTop={handleSwipedTop}
            onSwipedBottom={handleSwipedBottom}
            onSwipedRight={handleSwipedRight}
            onSwipedLeft={handleSwipedLeft}
            onSwiped={handleSwiped}
            cardIndex={currentIndex}
            verticalSwipe={swipingEnabled}
            horizontalSwipe={swipingEnabled}
            disableTopSwipe={!swipingEnabled}
            disableBottomSwipe={!swipingEnabled}
            disableLeftSwipe={!swipingEnabled}
            disableRightSwipe={!swipingEnabled}
            verticalThreshold={SCREEN_HEIGHT / 6}
            horizontalThreshold={width / 6}
            useViewOverflow={false}
            preventSwiping={['up', 'down', 'left', 'right']}
            swipeBackCard={false}
            overlayLabels={swipingEnabled ? {
              left: {
                element: (
                  <View style={[styles.overlayWrapper, { borderColor: '#FF4B4B' }]}>
                    <View>
                      <Ionicons name="close-circle" size={40} color="#FF4B4B" />
                    </View>
                    <View>
                      <Text style={[styles.overlayText, { color: '#FF4B4B' }]}>
                        Not Watched
                      </Text>
                    </View>
                  </View>
                )
              },
              right: {
                element: (
                  <View style={[styles.overlayWrapper, { borderColor: '#4BFF4B' }]}>
                    <View>
                      <Ionicons name="checkmark-circle" size={40} color="#4BFF4B" />
                    </View>
                    <View>
                      <Text style={[styles.overlayText, { color: '#4BFF4B' }]}>
                        Watched
                      </Text>
                    </View>
                  </View>
                )
              },
              top: {
                element: (
                  <View style={[styles.overlayWrapper, { borderColor: '#FFD700' }]}>
                    <View>
                      <Ionicons name="repeat" size={40} color="#FFD700" />
                    </View>
                    <View>
                      <Text style={[styles.overlayText, { color: '#FFD700' }]}>
                        Most Watch
                      </Text>
                    </View>
                  </View>
                )
              },
              bottom: {
                element: (
                  <View style={[styles.overlayWrapper, { borderColor: '#00BFFF' }]}>
                    <View>
                      <Ionicons name="time" size={40} color="#00BFFF" />
                    </View>
                    <View>
                      <Text style={[styles.overlayText, { color: '#00BFFF' }]}>
                        Watch Later
                      </Text>
                    </View>
                  </View>
                )
              },
            } : undefined}
            swipeAnimationDuration={swipingEnabled ? 350 : 0}
            animateCardOpacity={true}
            containerStyle={styles.swiperContainer}
            cardStyle={styles.cardStyle}
          />
        </View>
      </GestureHandlerRootView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  gestureContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  filterContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  swiperContainer: {
    flex: 1,
  },
  cardStyle: {
    width: DIMS.width,
    height: getCardHeight(),
  },
  swiperWrapper: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 90 : 50, // Add space for filter
  },
  cardWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: width,
    height: SCREEN_HEIGHT,
  },
  overlayWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -75 }, { translateY: -50 }],
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  cardContainer: {
    width: DIMS.width,
    height: getCardHeight(),
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  blurredCard: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.3,
    backgroundColor: '#000',
    transform: [{ scale: 0.95 }], // Slightly smaller than the main card
  },
  nextCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  nextCardBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    opacity: 0.5,
  },
});

export default CineBrowseScreen;

interface Movie {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  vote_average: number;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  genres?: Array<{ id: number; name: string }>;
  category?: string;
  vote_count?: number;
  media_type?: 'movie' | 'tv';
}
