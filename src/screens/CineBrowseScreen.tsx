////////////////////////////////////////////////////////////////////////////////
// CineBrowseScreen.tsx
////////////////////////////////////////////////////////////////////////////////
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  ScrollView,
  FlatList,
} from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { StackNavigationProp } from '@react-navigation/stack';
import FlipCard from '../components/FlipCard';
import { auth, db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { DIMS, getCardHeight } from '../theme';
import { fetchMoviesByCategory, searchMoviesAndShows } from '../services/tmdb';
import { useFonts } from 'expo-font';
import InfoDrawer from '../components/InfoDrawer';

const { height } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 100;
const SCREEN_HEIGHT = height - TAB_BAR_HEIGHT;
const BATCH_SIZE = 20;

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface Movie {
  id: number;
  title: string;  // Changed from optional to required
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  overview: string;
  release_date: string;  // Changed from optional to required
  first_air_date?: string;
  runtime?: number;
  genres?: Array<{ id: number; name: string }>;
  category?: string;
  vote_count?: number;
  media_type?: 'movie' | 'tv';
  popularity?: number;
}

interface Review {
  id: string;
  author: string;
  content: string;
  created_at: string;
  author_details?: {
    rating?: number;
    avatar_path?: string;
  };
}

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
}

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
  const displayedMovieIds = useRef<Set<number>>(new Set());
  const [errorCount, setErrorCount] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [credits, setCredits] = useState<{ cast: any[], crew: any[] }>({ cast: [], crew: [] });
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const MAX_ERROR_ATTEMPTS = 3;

  const swipeAnimatedValue = useRef(new Animated.Value(0)).current;
  const swipeDirectionRef = useRef<'left' | 'right' | null>(null);
  const debouncedFetch = useRef<any>(null);

  const [preloadedCards, setPreloadedCards] = useState<Movie[]>([]);

  // Drawer animation refs
  const searchDrawerAnim = useRef(new Animated.Value(0)).current;
  
  const preloadNextCards = useCallback(
    (currIndex: number) => {
      const nextCards = movies.slice(currIndex, currIndex + 5);
      
      // Preload images using Image.prefetch
      nextCards.forEach(movie => {
        if (movie?.poster_path) {
          Image.prefetch(`https://image.tmdb.org/t/p/w500${movie.poster_path}`);
        }
      });
    },
    [movies]
  );

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounceRef = useRef<NodeJS.Timeout>();
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [isSearchDrawerVisible, setIsSearchDrawerVisible] = useState(false);

  const swiperRef = useRef<any>(null);

  // Toggle search drawer with animation
  const toggleSearchDrawer = (visible: boolean) => {
    setIsSearchDrawerVisible(visible);
    Animated.timing(searchDrawerAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true
    }).start();
  };

  const shuffleArray = <T extends any>(array: T[]): T[] => {
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
    
    // Clear existing state first
    setMovies([]);
    setIsSearchMode(true);
    displayedMovieIds.current.clear();

    // Create complete movie object with required non-null values
    const completeMovie: Movie = {
      ...selectedMovie,
      title: selectedMovie.title || selectedMovie.name || 'Unknown Title',
      poster_path: selectedMovie.poster_path || null,
      backdrop_path: selectedMovie.backdrop_path || null,
      media_type: selectedMovie.media_type || 'movie',
      release_date: selectedMovie.release_date || selectedMovie.first_air_date || new Date().toISOString().split('T')[0],
      vote_average: selectedMovie.vote_average || 0,
      overview: selectedMovie.overview || 'No overview available'
    };

    // Update state
    setMovies([completeMovie]);
    setCurrentIndex(0);
    
    // Reset swiper position
    if (swiperRef.current) {
      swiperRef.current.jumpToCardIndex(0);
    }

    // Close search drawer with animation
    toggleSearchDrawer(false);

    // Reset and fetch new movies after a delay
    setTimeout(() => {
      setIsSearchMode(false);
      setCurrentPage(1);
      displayedMovieIds.current.clear();
      fetchMoreMovies();
    }, 500);
  }, []);

  // Handle search with debounce
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

  useEffect(() => {
    // Update selected movie when current index changes
    if (movies[currentIndex]) {
      setSelectedMovie(movies[currentIndex]);
    }
  }, [currentIndex, movies]);

  // Update handleSearchBarPress to use selected movie
  const handleSearchBarPress = () => {
    setSelectedMovie(movies[currentIndex] || null);
    toggleSearchDrawer(true);
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
    // Update current index first
    setCurrentIndex(index + 1);
    
    // Check if we need more movies
    if (movies.length - (index + 1) <= 5 && !isSearchMode) {
      fetchMoreMovies();
    }
  }, [movies, isSearchMode]);

  const saveMovieToFirebase = async (movie: Movie, category: string) => {
    if (!movie || !auth.currentUser) return;
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const movieRef = doc(collection(userRef, 'movies'), movie.id.toString());
      
      const movieData = {
        ...movie,
        category: category || 'uncategorized',
        timestamp: new Date().toISOString(),
        userId: auth.currentUser.uid,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
      };

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
      onPress={handleSearchBarPress}
    >
      <View style={styles.searchBarPlaceholder}>
        <Ionicons name="search" size={24} color="#666" />
        <Text style={styles.searchBarPlaceholderText}>
          Search movies & TV shows...
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderBackground = () => {
    return (
      <View style={styles.fullScreenBackground}>
        <Image
          source={require('../../assets/background.jpg')}
          style={styles.backgroundImage}
          blurRadius={15}
        />
        <View style={styles.backgroundOverlay} />
      </View>
    );
  };

  const renderCastItem = ({ item }: { item: CastMember }) => (
    <View style={styles.castMember}>
      <Image
        source={{
          uri: item.profile_path
            ? `https://image.tmdb.org/t/p/w185${item.profile_path}`
            : 'https://via.placeholder.com/185x278?text=No+Image'
        }}
        style={styles.castImage}
      />
      <Text style={styles.castName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.castCharacter} numberOfLines={1}>{item.character}</Text>
    </View>
  );

  const renderCrewItem = ({ item }: { item: CrewMember }) => (
    <Text style={styles.crewMember}>
      {item.job}: {item.name}
    </Text>
  );

  const renderCastSection = () => {
    if (!selectedMovie) return null;
    return (
      <>
        <Text style={styles.modalSection}>Cast</Text>
        {isLoadingCredits ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : credits.cast.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.castContainer}
            nestedScrollEnabled={true}
          >
            {credits.cast.map((castMember) => (
              <View key={`cast-${castMember.id}`} style={styles.castMember}>
                <Image
                  source={{
                    uri: castMember.profile_path
                      ? `https://image.tmdb.org/t/p/w185${castMember.profile_path}`
                      : 'https://via.placeholder.com/185x278?text=No+Image'
                  }}
                  style={styles.castImage}
                />
                <Text style={styles.castName} numberOfLines={1}>{castMember.name}</Text>
                <Text style={styles.castCharacter} numberOfLines={1}>{castMember.character}</Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.noDataText}>No cast information available</Text>
        )}
      </>
    );
  };

  const renderCrewSection = () => {
    const movie = movies[currentIndex];
    if (!movie) return null;
    return (
      <>
        <Text style={styles.modalSection}>Crew</Text>
        {isLoadingCredits ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : credits.crew.length > 0 ? (
          <FlatList
            data={credits.crew}
            renderItem={renderCrewItem}
            keyExtractor={(item) => `crew-${item.id}-${item.job}`}
            scrollEnabled={false}
            initialNumToRender={5}
          />
        ) : (
          <Text style={styles.noDataText}>No crew information available</Text>
        )}
      </>
    );
  };

  const renderReviews = () => {
    const movie = movies[currentIndex];
    if (!movie) return null;
    return (
      <>
        <Text style={styles.modalSection}>User Reviews</Text>
        {isLoadingDetails ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : reviews.length > 0 ? (
          reviews.map((review) => (
            <View key={review.id} style={styles.reviewContainer}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAuthor}>{review.author}</Text>
                {review.author_details?.rating && (
                  <Text style={styles.reviewRating}>
                    ⭐ {review.author_details.rating.toFixed(1)}
                  </Text>
                )}
              </View>
              <Text style={styles.reviewDate}>
                {new Date(review.created_at).toLocaleDateString()}
              </Text>
              <Text style={styles.reviewContent} numberOfLines={5}>
                {review.content}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No reviews available</Text>
        )}
      </>
    );
  };

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

      <InfoDrawer
        isVisible={isSearchDrawerVisible}
        onClose={() => toggleSearchDrawer(false)}
      >
        {selectedMovie ? (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedMovie.title || selectedMovie.name}</Text>
            <Text style={styles.modalRating}>⭐ {selectedMovie.vote_average.toFixed(1)}</Text>
            {selectedMovie.release_date && (
              <Text style={styles.modalSubtitle}>
                Release Date: {new Date(selectedMovie.release_date).toLocaleDateString()}
              </Text>
            )}
            <Text style={styles.modalSectionTitle}>Overview</Text>
            <Text style={styles.modalText}>{selectedMovie.overview}</Text>
            {renderCastSection()}
            {renderCrewSection()}
            {renderReviews()}
          </View>
        ) : (
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>No movie selected</Text>
          </View>
        )}
      </InfoDrawer>
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

  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalHeader: {
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalRating: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 15,
  },
  modalSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 10,
  },
  modalText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  modalSection: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 10,
  },
  castContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  castMember: {
    width: 100,
    marginRight: 15,
    alignItems: 'center',
  },
  castImage: {
    width: 80,
    height: 120,
    borderRadius: 10,
    marginBottom: 5,
  },
  castName: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
    color: '#ffffff',
  },
  castCharacter: {
    fontSize: 11,
    color: '#9e9e9e',
    textAlign: 'center',
  },
  crewMember: {
    fontSize: 14,
    marginBottom: 5,
    color: '#e0e0e0',
  },
  noDataText: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginVertical: 10,
  },
  reviewContainer: {
    marginBottom: 15,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reviewAuthor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  reviewRating: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  reviewDate: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 5,
  },
  reviewContent: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});

export default CineBrowseScreen;