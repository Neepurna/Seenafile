import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Animated,
  Platform,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Alert,
  PanResponder,
} from 'react-native';
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import MovieReview from './MovieReview';
import { COLORS, DIMS, SPACING, getCardHeight } from '../theme';
import { getImageUrl } from '../services/instance';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// Keep importing InfoDrawer to avoid errors
import InfoDrawer from './InfoDrawer';

const API_KEY = '559819d48b95a2e3440df0504dea30fd';

interface Movie {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  vote_average: number;
  overview: string;
  release_date?: string | null;
  first_air_date?: string | null;
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
  rating?: number;
  author_details?: {
    rating?: number;
    avatar_path?: string;
  };
}

interface FlipCardProps {
  movie: {
    id: number;
    title: string;
    name?: string;
    poster_path: string | null;
    backdrop_path: string | null;
    vote_average: number;
    overview: string;
    release_date: string;
    runtime?: number;
    genres?: Array<{ id: number; name: string }>;
    category?: string;
    vote_count?: number;
    media_type?: 'movie' | 'tv';
    cast?: Array<{
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
    }>;
    crew?: Array<{
      id: number;
      name: string;
      job: string;
      department: string;
    }>;
    popularity?: number;
    status?: string;
    original_language?: string;
    production_countries?: Array<{ iso_3166_1: string; name: string }>;
  };
  onSwipingStateChange: (enabled: boolean) => void;
}

type CastMember = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
};

type CrewMember = {
  id: number;
  name: string;
  job: string;
  department: string;
};

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? 100 : 100; // Match header height from Tabs.tsx
const TAB_BAR_HEIGHT = 100; // Match tab bar height from Tabs.tsx
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 0;
const SEARCH_BAR_HEIGHT = 70; // Add this constant
const AVAILABLE_HEIGHT = height - HEADER_HEIGHT - TAB_BAR_HEIGHT - STATUS_BAR_HEIGHT;
const CARD_PADDING = 12; // Reduced padding
const CARD_WIDTH = width - (CARD_PADDING * 2);
const CARD_HEIGHT = AVAILABLE_HEIGHT * 0.95; // Increased to use more available height

const FlipCard: React.FC<FlipCardProps> = ({ movie, onSwipingStateChange }) => {
  const {
    title = '',
    poster_path = null,
    vote_average = 0,
    overview = '',
    release_date = '',
    runtime = 0,
    genres = []
  } = movie || {};

  const [isFlipped, setIsFlipped] = useState(false);
  // Set showInfo to false and never change it
  const [showInfo, setShowInfo] = useState(false);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);
  const [credits, setCredits] = useState<{ cast: any[], crew: any[] }>({ cast: [], crew: [] });
  const [movieDetails, setMovieDetails] = useState<Movie | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const isAnimating = useRef(false);
  const [posterUrl, setPosterUrl] = useState<string>('https://via.placeholder.com/500x750?text=Loading...');
  const [imageError, setImageError] = useState<boolean>(false);
  const [backdropUrl, setBackdropUrl] = useState<string>('');
  const panRef = useRef(new Animated.Value(0)).current;

  // Add fade-in animation for new cards
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [movie.id]); // Reset animation when movie changes

  useEffect(() => {
    onSwipingStateChange(!isFlipped);
  }, [isFlipped, onSwipingStateChange]);

  // Add useEffect to handle swipe disabling when modal is open
  useEffect(() => {
    onSwipingStateChange(!isFlipped);
  }, [isFlipped, onSwipingStateChange]);

  // Load image URL with fallback
  useEffect(() => {
    let mounted = true;
    
    const loadImage = async () => {
      if (!movie?.poster_path) {
        setPosterUrl('https://via.placeholder.com/500x750?text=No+Image');
        return;
      }

      try {
        const url = await getImageUrl(movie.poster_path);
        if (mounted) setPosterUrl(url);
      } catch (error) {
        console.warn('Image loading error:', error);
        if (mounted) {
          setPosterUrl('https://via.placeholder.com/500x750?text=Error+Loading+Image');
          setImageError(true);
        }
      }
    };

    loadImage();
    return () => { mounted = false; };
  }, [movie?.poster_path]);

  // Add instant load for images
  useEffect(() => {
    if (movie?.poster_path) {
      const url = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
      Image.prefetch(url).then(() => {
        setPosterUrl(url);
      });
    }
  }, [movie?.poster_path]);

  // Add backdrop URL loading
  useEffect(() => {
    if (movie?.backdrop_path) {
      const url = `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`;
      Image.prefetch(url).then(() => {
        setBackdropUrl(url);
      });
    }
  }, [movie?.backdrop_path]);

  const handleDoubleTap = () => {
    const currentTime = Date.now();
    const tapInterval = currentTime - lastTap.current;
    
    if (tapInterval < 300) { // Increased from 200 to 300ms for better detection
      if (!isAnimating.current) {
        performFlip();
      }
      lastTap.current = 0;
    } else {
      lastTap.current = currentTime;
    }
  };

  const performFlip = () => {
    if (isAnimating.current) return;
    
    isAnimating.current = true;

    Animated.spring(animatedValue, {
      toValue: isFlipped ? 0 : 180,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
      restSpeedThreshold: 100,
      restDisplacementThreshold: 40,
    }).start(({ finished }) => {
      if (finished) {
        setIsFlipped(!isFlipped);
        isAnimating.current = false;
      }
    });
  };

  const frontInterpolate = animatedValue.interpolate({
    inputRange: [0, 90, 180],
    outputRange: ['0deg', '-90deg', '-180deg']
  });

  const backInterpolate = animatedValue.interpolate({
    inputRange: [0, 90, 180],
    outputRange: ['180deg', '90deg', '0deg']
  });

  const frontOpacity = animatedValue.interpolate({
    inputRange: [0, 89.9, 90, 180],
    outputRange: [1, 1, 0, 0]
  });

  const backOpacity = animatedValue.interpolate({
    inputRange: [0, 89.9, 90, 180],
    outputRange: [0, 0, 1, 1]
  });

  const formatVoteCount = (count: number) => {
    return count?.toString() || '0';
  };

  const fetchMovieCredits = async (movieId: number) => {
    try {
      setIsLoadingCredits(true);
      const endpoint = (movie.media_type === 'tv' || movie.category === 'tv') 
        ? `tv/${movieId}/credits` 
        : `movie/${movieId}/credits`;

      const response = await fetch(
        `https://api.themoviedb.org/3/${endpoint}?api_key=${API_KEY}`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
        }
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setCredits({
        cast: data.cast?.slice(0, 10) || [],
        crew: data.crew?.filter((c: CrewMember) => 
          ['Director', 'Producer', 'Screenplay', 'Creator'].includes(c.job)
        ).slice(0, 5) || []
      });
    } catch (error) {
      console.error('Error fetching credits:', error);
      setCredits({ cast: [], crew: [] });
    } finally {
      setIsLoadingCredits(false);
    }
  };

  const fetchMovieDetailsAndReviews = async (movieId: number) => {
    try {
      setIsLoadingDetails(true);
      const endpoint = movie.media_type === 'tv' ? 'tv' : 'movie';
      
      const [detailsResponse, reviewsResponse, imagesResponse] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/${endpoint}/${movieId}?api_key=${API_KEY}`),
        fetch(`https://api.themoviedb.org/3/${endpoint}/${movieId}/reviews?api_key=${API_KEY}`),
        fetch(`https://api.themoviedb.org/3/${endpoint}/${movieId}/images?api_key=${API_KEY}`)
      ]);

      if (!detailsResponse.ok || !reviewsResponse.ok || !imagesResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const [details, reviewsData, imagesData] = await Promise.all([
        detailsResponse.json(),
        reviewsResponse.json(),
        imagesResponse.json()
      ]);

      setMovieDetails(details);
      setReviews(reviewsData.results?.slice(0, 5) || []);

    } catch (error) {
      console.error('Error fetching details:', error);
      setReviews([]);
    } finally {
      setIsLoadingDetails(false);
    }
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

  const renderCastSection = () => (
    <>
      <Text style={styles.modalSection}>Cast</Text>
      {isLoadingCredits ? (
        <ActivityIndicator size="small" color="#007AFF" />
      ) : credits.cast && credits.cast.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.castContainer}
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
              <Text style={styles.castName} numberOfLines={1}>
                {castMember.name || 'Unknown Actor'}
              </Text>
              <Text style={styles.castCharacter} numberOfLines={1}>
                {castMember.character || 'Unknown Role'}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.noDataText}>No cast information available</Text>
      )}
    </>
  );

  const renderCrewSection = () => (
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

  // Add this new function to render reviews
  const renderReviews = () => (
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

  // Update pan responder for swipe to close from any part of the drawer
  const panResponder = React.useMemo(() => 
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        // Allow both left and right swipe
        panRef.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        // Close on significant right swipe
        if (gesture.dx > 50) {
          Animated.spring(panRef, {
            toValue: width,
            useNativeDriver: true,
          }).start(() => {
            setShowInfo(false);
            onSwipingStateChange(!isFlipped);
          });
        } else {
          // Reset position if swipe wasn't enough
          Animated.spring(panRef, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
    [isFlipped]
  );

  // Simplify renderMovieDetails to do nothing since InfoDrawer is disabled
  const renderMovieDetails = () => null;

  // Add new state for slide animation
  const slideAnim = useRef(new Animated.Value(-width)).current;

  // Update modal animation
  useEffect(() => {
    if (showInfo) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: -width,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    }
  }, [showInfo]);

  // Update renderFrontFace to remove title, rating and double tap info
  const handlePostReview = useCallback(async (reviewText: string, rating: number) => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to post a review');
      return;
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const moviesRef = collection(userRef, 'movies');
      const movieId = `${movie.id}_review`; // Create unique ID for review

      const reviewData = {
        backdrop: movie.backdrop_path || '',
        createdAt: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          timeZoneName: 'short'
        }),
        isPublic: true,
        likes: 0,
        movieId: movie.id,
        movieTitle: movie.title,
        rating: rating,
        review: reviewText,
        userId: auth.currentUser.uid,
        username: auth.currentUser.displayName || 'Anonymous',
        category: 'critics',
        timestamp: serverTimestamp()
      };

      await setDoc(doc(moviesRef, movieId), reviewData);
      performFlip();
      Alert.alert('Success', 'Your review has been posted!');
    } catch (error) {
      console.error('Error posting review:', error);
      Alert.alert('Error', 'Failed to post review. Please try again.');
    }
  }, [movie, performFlip]);

  // Add animation timing configuration
  const cardAnimConfig = {
    duration: 200,
    useNativeDriver: true,
  };

  // Add effect to fetch movie details and credits on mount
  useEffect(() => {
    const fetchMovieData = async () => {
      if (!movie?.id) return;
      
      try {
        setIsLoadingDetails(true);
        setIsLoadingCredits(true);
        
        // Determine if it's a movie or TV show
        const type = movie.media_type === 'tv' ? 'tv' : 'movie';
        
        // Fetch both details and credits in parallel
        const [detailsResponse, creditsResponse] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/${type}/${movie.id}?api_key=${API_KEY}&append_to_response=reviews`),
          fetch(`https://api.themoviedb.org/3/${type}/${movie.id}/credits?api_key=${API_KEY}`)
        ]);

        if (detailsResponse.ok && creditsResponse.ok) {
          const [details, credits] = await Promise.all([
            detailsResponse.json(),
            creditsResponse.json()
          ]);

          // Update movie details
          setMovieDetails({
            ...details,
            title: details.title || details.name || movie.title || movie.name || 'Untitled',
            release_date: details.release_date || details.first_air_date || movie.release_date || 'Unknown'
          });

          // Update credits
          setCredits({
            cast: credits.cast?.slice(0, 10) || [],
            crew: credits.crew?.filter((c: CrewMember) => 
              ['Director', 'Producer', 'Screenplay', 'Creator'].includes(c.job)
            ).slice(0, 5) || []
          });

          // Update reviews if available
          if (details.reviews?.results) {
            setReviews(details.reviews.results.slice(0, 5));
          }
        }
      } catch (error) {
        console.error('Error fetching movie data:', error);
      } finally {
        setIsLoadingDetails(false);
        setIsLoadingCredits(false);
      }
    };

    fetchMovieData();
  }, [movie?.id]);

  // Update renderFrontFace to include title and rating
  const renderFrontFace = () => (
    <View style={styles.frontFaceContainer}>
      <Image 
        source={{ uri: posterUrl }}
        style={styles.poster}
        onError={() => {
          if (!imageError) {
            setImageError(true);
            setPosterUrl('https://via.placeholder.com/500x750?text=Error+Loading+Image');
          }
        }}
      />
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={handleDoubleTap}>
      <Animated.View style={styles.container}>
        <Animated.View 
          style={[
            styles.cardFace,
            {
              transform: [{ perspective: 2000 }, { rotateY: frontInterpolate }],
              opacity: frontOpacity,
              zIndex: isFlipped ? 0 : 1,
            }
          ]}
        >
          {renderFrontFace()}
        </Animated.View>

        <Animated.View 
          style={[styles.cardFace, styles.cardBack, { transform: [{ perspective: 2000 }, { rotateY: backInterpolate }], opacity: backOpacity, zIndex: isFlipped ? 1 : 0 }]}
        >
          <MovieReview 
            movie={movie} 
            onDoubleTap={handleDoubleTap}
            onPostReview={handlePostReview}
          />
        </Animated.View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    width: DIMS.cardWidth,
    height: getCardHeight(),
    alignSelf: 'center', // Add this
    justifyContent: 'center', // Add this
    backgroundColor: 'transparent',
  },
  cardFace: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    backfaceVisibility: 'hidden',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardBack: {
    backgroundColor: '#000',
    transform: [{ rotateY: '180deg' }],
  },
  frontFaceContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#1a1a1a',
  },
  poster: {
    width: '100%',
    height: '100%', // Use full height
    resizeMode: 'cover',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a11a1a',
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#ffffff', // White text
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#9e9e9e', // Light gray text
    marginBottom: 10,
  },
  modalRating: {
    fontSize: 16,
    marginBottom: 10,
    color: '#ffffff', // White text
  },
  modalSection: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    color: '#ffffff', // White text
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#e0e0e0', // Light gray text
  },
  modalGenres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  modalGenre: {
    fontSize: 14,
    backgroundColor: '#333333', // Dark gray background
    color: '#ffffff', // White text
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#333333', // Dark gray background
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff', // White text
    fontSize: 16,
    fontWeight: 'bold',
  },
  genreWrapper: {
    marginRight: 8,
    marginBottom: 8,
  },
  castContainer: {
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
    color: '#ffffff', // White text
  },
  castCharacter: {
    fontSize: 11,
    color: '#9e9e9e', // Light gray text
    textAlign: 'center',
  },
  crewContainer: {
    marginBottom: 15,
  },
  crewMember: {
    fontSize: 14,
    marginBottom: 5,
    color: '#e0e0e0', // Light gray text
  },
  noDataText: {
    fontSize: 14,
    color: '#9e9e9e', // Light gray text
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
  },
  reviewContainer: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#333333', // Dark gray background
    borderRadius: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewAuthor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff', // White text
  },
  reviewRating: {
    fontSize: 14,
    color: '#9e9e9e', // Light gray text
  },
  reviewDate: {
    fontSize: 12,
    color: '#757575', // Medium gray text
    marginBottom: 8,
  },
  reviewContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#e0e0e0', // Light gray text
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    width: '100%',
    overflow: 'hidden',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  modalContentOverlay: {  // Renamed from modalOverlay to avoid duplicate
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 17, 26, 0.97)',
  },
  modalCloseButton: {  // Renamed from closeButton to modalCloseButton
    position: 'absolute',
    bottom: 30,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 10,
  },
  closeButtonActive: {
    backgroundColor: 'rgba(0, 50, 0, 0.9)',
    transform: [{ scale: 1.1 }],
  },
  closeButtonInactive: {
    backgroundColor: 'rgba(50, 0, 0, 0.9)',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '30%',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
  },
  ratingBadge: {
    position: 'absolute',
    top: -70,
    right: 15,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  ratingText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 18,
  },
  titleText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  yearText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  tapInstruction: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  tapText: {
    color: '#fff',
    fontSize: 12,
  },
});


export default FlipCard;
