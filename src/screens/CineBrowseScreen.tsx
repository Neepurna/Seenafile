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

const { width, height } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 100;
const HEADER_HEIGHT = Platform.OS === 'ios' ? 100 : 100;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 0;
const SEARCH_BAR_HEIGHT = 70; // Add this constant
const SCREEN_HEIGHT = height - TAB_BAR_HEIGHT - HEADER_HEIGHT - STATUS_BAR_HEIGHT - SEARCH_BAR_HEIGHT;

const NEXT_CARD_SCALE = 0.96; // Changed from 0.92 to 0.96 for subtler scaling
const NEXT_CARD_OPACITY = 0.8; // Changed from 0.5 to 0.8 for better visibility
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
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const [isSearchGridView, setIsSearchGridView] = useState(true);
  const [selectedSearchMovie, setSelectedSearchMovie] = useState<Movie | null>(null);

  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  useEffect(() => {
    fetchMoreMovies();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Screen focused, resetting state...');
      setCurrentIndex(0);
      setMovies([]);
      displayedMovieIds.current.clear();
      movieCache.data.clear();
      movieCache.timestamp.clear();
      fetchMoreMovies();
    });

    return unsubscribe;
  }, [navigation]);

  const handleRefresh = async () => {
    setCurrentPage(1);
    setMovies([]);
    displayedMovieIds.current.clear();
    await fetchMoreMovies();
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
      console.log('Appending unique movies:', uniqueNewMovies.length);
      return [...prevMovies, ...uniqueNewMovies];
    });
  }, []);

  const handleFetchError = (error: Error) => {
    console.error('Fetch error:', error);
    setErrorCount((prev) => prev + 1);
  };

  const fetchMoreMovies = async () => {
    if (isFetching || errorCount >= MAX_ERROR_ATTEMPTS) return;

    console.log('Fetching movies...', { currentPage, isFetching });
    PerformanceLogger.start('fetchMoreMovies');
    
    try {
      setIsFetching(true);
      const cacheKey = `page_${currentPage}`;
      const now = Date.now();

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

      const response = await fetchMoviesByCategory(currentPage, {
        batchSize: BATCH_SIZE,
      });

      console.log('API response received:', { 
        resultsCount: response?.results?.length,
        currentMoviesCount: movies.length 
      });

      if (!response?.results?.length) {
        throw new Error('No results returned');
      }

      const newMovies = response.results
        .filter((m: Movie) => !displayedMovieIds.current.has(m.id))
        .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

      console.log('Processed new movies:', newMovies.length);

      movieCache.data.set(cacheKey, newMovies);
      movieCache.timestamp.set(cacheKey, now);

      appendMovies(newMovies);
      setBackgroundCards((prev) => [...prev, ...newMovies.slice(0, 3)]);
      newMovies.forEach((movie: Movie) => displayedMovieIds.current.add(movie.id));
      setCurrentPage((prev) => prev + 1);

    } catch (error) {
      console.error('Error fetching more movies:', error);
      handleFetchError(error as Error);
    } finally {
      setIsFetching(false);
      PerformanceLogger.end('fetchMoreMovies');
    }
  };

  const saveMovieToFirestore = async (movie: Movie, category: string) => {
    if (!auth.currentUser || !movie) {
      console.warn('No user logged in or invalid movie data');
      return;
    }
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const movieRef = doc(collection(userRef, 'movies'), movie.id.toString());
      const movieDoc = await getDoc(movieRef);
      if (movieDoc.exists()) {
        console.log('Movie already saved');
        return;
      }
      const mediaData = {
        movieId: movie.id.toString(),
        title: movie.title || movie.name,
        poster_path: movie.poster_path || null,
        media_type: movie.media_type || 'movie',
        category,
        timestamp: new Date(),
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
    // Optional: Left-swipe logic
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

  const handleSwiped = useCallback(
    (index: number) => {
      PerformanceLogger.start('cardSwipe');
      setCurrentIndex(index + 1);
      preloadNextCards(index + 1);
      if (movies.length - (index + 1) <= 15) {
        fetchMoreMovies();
      }
      PerformanceLogger.end('cardSwipe');
    },
    [movies.length, fetchMoreMovies, preloadNextCards]
  );

  const handleSwipeStart = useCallback((cardIndex: number) => {
    const currentMovie = movies[cardIndex];
    const nextMovie = movies[cardIndex + 1];
    
    if (nextMovie?.poster_path) {
      Image.prefetch(`https://image.tmdb.org/t/p/w500${nextMovie.poster_path}`);
    }

    // Reset animation value
    swipeAnimatedValue.setValue(0);
  }, [movies]);

  const calculateNextCardStyle = (index: number) => {
    if (index !== currentIndex + 1) return {};
    
    const scale = swipeAnimatedValue.interpolate({
      inputRange: [-width/2, -width/4, 0, width/4, width/2],
      outputRange: [1, NEXT_CARD_SCALE, NEXT_CARD_SCALE, NEXT_CARD_SCALE, 1],
      extrapolate: 'clamp',
    });

    const opacity = swipeAnimatedValue.interpolate({
      inputRange: [-width/2, -width/4, 0, width/4, width/2],
      outputRange: [1, NEXT_CARD_OPACITY, NEXT_CARD_OPACITY, NEXT_CARD_OPACITY, 1],
      extrapolate: 'clamp',
    });

    const translateY = swipeAnimatedValue.interpolate({
      inputRange: [-width/2, 0, width/2],
      outputRange: [0, 15, 0],
      extrapolate: 'clamp',
    });

    return {
      transform: [
        { scale },
        { translateY }
      ],
      opacity,
    };
  };

  const renderCard = useCallback(
    (movie: Movie, index: number) => {
      if (!movie) return null;

      const isNextCard = index === currentIndex + 1;
      const cardStyle = isNextCard ? calculateNextCardStyle(index) : {};

      return (
        <View style={styles.cardWrapper}>
          <Animated.View
            style={[
              styles.cardContainer,
              cardStyle,
            ]}
          >
            <FlipCard movie={movie} onSwipingStateChange={setSwipingEnabled} />
          </Animated.View>
        </View>
      );
    },
    [currentIndex, calculateNextCardStyle]
  );

  useEffect(() => {
    const searchMovies = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setIsSearchGridView(false);
        setSelectedSearchMovie(null);
        fetchMoreMovies();
        return;
      }
      setIsSearching(true);
      try {
        const response = await searchMoviesAndShows(searchQuery);
        if (response?.results?.length) {
          const sortedResults = response.results.sort(
            (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)
          );
          setSearchResults(sortedResults);
          setIsSearchGridView(true);
          setSelectedSearchMovie(null);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    const debounceTimeout = setTimeout(searchMovies, 500);
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery]);

  const handlePressSearchResult = (movie: Movie) => {
    setSelectedSearchMovie(movie);
    setIsSearchGridView(false);
  };

  const renderSearchGrid = () => (
    <View style={styles.searchGridContainer}>
      {searchResults.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.searchGridItem}
          onPress={() => handlePressSearchResult(item)}
        >
          {item.poster_path && (
            <Image
              source={{ uri: `https://image.tmdb.org/t/p/w500${item.poster_path}` }}
              style={styles.searchGridImage}
            />
          )}
          <Text style={styles.searchGridText}>{item.title || item.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

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

  const swiperConfig = {
    stackSize: 3, // Increased from 2 to 3
    stackScale: 0.98, // More subtle scale difference
    stackSeparation: 14, // Adjusted for better visual spacing
    animateOverlayLabelsOpacity: true,
    animateCardOpacity: true,
    backgroundColor: 'transparent',
    cardHorizontalMargin: 0,
    cardVerticalMargin: 0,
    swipeAnimationDuration: TRANSITION_DURATION,
    overlayOpacityHorizontalThreshold: width / 8,
    overlayOpacityVerticalThreshold: SCREEN_HEIGHT / 8,
    onSwiping: (x: number) => {
      if (x !== 0) {
        swipeDirectionRef.current = x > 0 ? 'right' : 'left';
      }
      swipeAnimatedValue.setValue(x);
    },
    onSwipeStart: (cardIndex: number) => {
      handleSwipeStart(cardIndex);
    },
    onSwipeEnd: () => {
      Animated.timing(swipeAnimatedValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      swipeDirectionRef.current = null;
    },
  };

  return (
    <View style={styles.mainContainer}>
      {/* Background Layer */}
      {renderBackground()}

      {/* Content Layer */}
      <View style={styles.contentLayer}>
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>SeenaFile</Text>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search Bar now at top */}
        <View style={styles.topSearchSection}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.searchWrapper}
            onPress={() => searchInputRef.current?.focus()}
          >
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search movies & TV shows..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            ) : (
              <Ionicons name="search" size={20} color="#666" />
            )}
          </TouchableOpacity>
        </View>

        {/* Main Content */}
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
          ) : searchQuery && searchResults.length > 0 && isSearchGridView ? (
            renderSearchGrid()
          ) : selectedSearchMovie && !isSearchGridView ? (
            <View style={styles.cardsWrapper}>
              <Swiper
                {...swiperConfig}
                cards={[selectedSearchMovie]}
                renderCard={renderCard}
                onSwiping={(x: number) => swiperConfig.onSwiping(x)}
                onSwipeStart={(cardIndex) => swiperConfig.onSwipeStart(cardIndex)}
                onSwipeEnd={() => swiperConfig.onSwipeEnd()}
                infinite={false}
                cardVerticalMargin={0}
                cardHorizontalMargin={0}
                overlayOpacityHorizontalThreshold={width / 8}
                overlayOpacityVerticalThreshold={SCREEN_HEIGHT / 8}
                inputRotationRange={[-width / 2, 0, width / 2]}
                outputRotationRange={['-10deg', '0deg', '10deg']}
                onSwipedAll={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setIsSearchGridView(false);
                  setSelectedSearchMovie(null);
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
                overlayLabels={
                  swipingEnabled
                    ? {
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
                          ),
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
                          ),
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
                          ),
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
                          ),
                        },
                      }
                    : undefined
                }
                swipeAnimationDuration={swipingEnabled ? 350 : 0}
                animateCardOpacity={true}
                containerStyle={styles.swiperContainer}
                cardStyle={styles.cardStyle}
              />
            </View>
          ) : (
            // ...existing swiper logic for non-search scenario...
            <View style={styles.cardsWrapper}>
              <Swiper
                {...swiperConfig}
                cards={movies}
                renderCard={renderCard}
                onSwiping={(x: number) => swiperConfig.onSwiping(x)}
                onSwipeStart={(cardIndex) => swiperConfig.onSwipeStart(cardIndex)}
                onSwipeEnd={() => swiperConfig.onSwipeEnd()}
                infinite={false}
                cardVerticalMargin={0}
                cardHorizontalMargin={0}
                overlayOpacityHorizontalThreshold={width / 8}
                overlayOpacityVerticalThreshold={SCREEN_HEIGHT / 8}
                inputRotationRange={[-width / 2, 0, width / 2]}
                outputRotationRange={['-10deg', '0deg', '10deg']}
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
                overlayLabels={
                  swipingEnabled
                    ? {
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
                          ),
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
                          ),
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
                          ),
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
                          ),
                        },
                      }
                    : undefined
                }
                swipeAnimationDuration={swipingEnabled ? 350 : 0}
                animateCardOpacity={true}
                containerStyle={styles.swiperContainer}
                cardStyle={styles.cardStyle}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: 'transparent', // Change from #000 to transparent
  },
  fullScreenBackground: {
    position: 'absolute',
    width: '100%',
    height: '120%', // Slightly larger to account for scaling
    top: -50, // Move up slightly to ensure no gaps
    left: 0,
    zIndex: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    transform: [{ scale: 1.2 }], // Increased scale for better coverage
  },
  backgroundOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.65)', // Darkened overlay
    backdropFilter: 'blur(20px)',
  },
  contentLayer: {
    flex: 1,
    zIndex: 2,
  },
  headerContainer: {
    paddingTop: STATUS_BAR_HEIGHT,
    paddingHorizontal: 16,
    height: HEADER_HEIGHT,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    zIndex: 3,
  },
  topSearchSection: {
    position: 'absolute',
    top: HEADER_HEIGHT,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.95)',
    zIndex: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 46,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  contentContainer: {
    flex: 1,
    paddingTop: SEARCH_BAR_HEIGHT + 20, // Update this line
    marginBottom: TAB_BAR_HEIGHT, // Add bottom margin to avoid overlap
  },
  cardsWrapper: {
    flex: 1,
    justifyContent: 'center', // Center cards vertically
    marginTop: -20, // Adjust if needed to center perfectly
  },
  searchSection: {
    paddingHorizontal: 15,
    paddingBottom: 8,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 40,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 8,
    height: 40,
  },
  clearButton: {
    padding: 8,
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 50 : 30,
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 46,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 5,
  },
  searchSpinner: {
    position: 'absolute',
    right: 15,
    top: 13,
  },
  filterContainer: {
    width: '100%',
  },
  cardWrapper: {
    paddingHorizontal: 16,
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'visible', // Changed from 'hidden' to 'visible'
  },
  cardContainer: {
    width: '100%',
    height: getCardHeight(), // Make sure this matches your card dimensions
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    alignSelf: 'center',
    zIndex: 1,
  },
  preloadedBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  blurredCard: {
    width: '100%',
    height: '100%',
    
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
  topSearchSection: {
    paddingHorizontal: 15,
    paddingTop: 8,
    backgroundColor: '#000',
    // additional styling as needed
  },
  searchGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
  },
  searchGridItem: {
    width: (width - 60) / 3,
    marginBottom: 15,
    alignItems: 'center',
  },
  searchGridImage: {
    width: '100%',
    aspectRatio: 0.7,
    borderRadius: 6,
  },
  searchGridText: {
    color: '#fff',
    marginTop: 5,
    textAlign: 'center',
    fontSize: 12,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  swiperContainer: {
    backgroundColor: 'transparent',
  },
});

export default CineBrowseScreen;