import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import MovieReview from './MovieReview';
import { COLORS, DIMS, SPACING, getCardHeight } from '../theme';
import { getImageUrl } from '../services/instance';

const API_KEY = '559819d48b95a2e3440df0504dea30fd';

interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  overview: string;
  release_date: string;
  runtime?: number;
  genres?: Array<{ id: number; name: string }>;
  category?: string; // Make this more flexible
  vote_count?: number;
  cast?: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
  }[];
  crew?: {
    id: number;
    name: string;
    job: string;
    department: string;
  }[];
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
  movie: Movie;
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
const SCREEN_HEIGHT = height - TAB_BAR_HEIGHT - HEADER_HEIGHT - STATUS_BAR_HEIGHT;
const FILTER_HEIGHT = 70; // Height of FilterCard component
const DETAILS_HEIGHT = 100; // Fixed height for details section
const CARD_HEIGHT = SCREEN_HEIGHT - FILTER_HEIGHT; // Removed the -20 padding

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

  useEffect(() => {
    onSwipingStateChange(!isFlipped);
  }, [isFlipped, onSwipingStateChange]);

  // Add useEffect to handle swipe disabling when modal is open
  useEffect(() => {
    onSwipingStateChange(!showInfo && !isFlipped);
  }, [showInfo, isFlipped, onSwipingStateChange]);

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
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${API_KEY}`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCredits({
        cast: data.cast?.slice(0, 10) || [],
        crew: data.crew?.filter((c: CrewMember) => 
          ['Director', 'Producer', 'Screenplay'].includes(c.job)
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
      
      const [detailsResponse, reviewsResponse, imagesResponse] = await Promise.all([
        fetch(
          `https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}`,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
          }
        ),
        fetch(
          `https://api.themoviedb.org/3/movie/${movieId}/reviews?api_key=${API_KEY}`,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
          }
        ),
        fetch(
          `https://api.themoviedb.org/3/movie/${movieId}/images?api_key=${API_KEY}`,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
          }
        )
      ]);

      if (!detailsResponse.ok || !reviewsResponse.ok || !imagesResponse.ok) {
        throw new Error('Failed to fetch movie data');
      }

      const [details, reviewsData, imagesData] = await Promise.all([
        detailsResponse.json(),
        reviewsResponse.json(),
        imagesResponse.json()
      ]);

      setMovieDetails(details);
      setReviews(reviewsData.results?.slice(0, 5) || []);

    } catch (error) {
      console.error('Error fetching movie details and reviews:', error);
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
      ) : credits.cast.length > 0 ? (
        <FlatList
          data={credits.cast}
          renderItem={renderCastItem}
          keyExtractor={(item) => `cast-${item.id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          contentContainerStyle={styles.castContainer}
        />
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

  // Update the modal close handler
  const handleModalClose = () => {
    setShowInfo(false);
    onSwipingStateChange(!isFlipped); // Re-enable swiping if card isn't flipped
  };

  // Update renderMovieDetails with new close handler
  const renderMovieDetails = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showInfo}
      onRequestClose={handleModalClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalSubtitle}>
                Released: {release_date}
              </Text>
              <Text style={styles.modalRating}>
                Rating: ⭐ {vote_average.toFixed(1)}
              </Text>
              <Text style={styles.modalRating}>
                Votes: {movie.vote_count || 0}
              </Text>
              {runtime > 0 && (
                <Text style={styles.modalText}>
                  Runtime: {runtime} minutes
                </Text>
              )}
              <Text style={styles.modalSection}>Genres</Text>
              <View style={styles.modalGenres}>
                {(movieDetails?.genres || []).map(genre => (
                  <View key={genre.id} style={styles.genreWrapper}>
                    <Text style={styles.modalGenre}>{genre.name}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.modalSection}>Overview</Text>
              <Text style={styles.modalText}>{overview}</Text>
              {renderCastSection()}
              {renderCrewSection()}
              {renderReviews()}
            </View>
          </ScrollView>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleModalClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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

  // Update the info button press handler
  const handleInfoPress = (e: any) => {
    e.stopPropagation();
    setShowInfo(true);
    onSwipingStateChange(false); // Disable swiping when opening modal
    fetchMovieCredits(movie.id);
    fetchMovieDetailsAndReviews(movie.id);
  };

  // Update the info button in renderFrontFace
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
      <TouchableOpacity
        style={styles.infoButton}
        onPress={handleInfoPress}
      >
        <Text style={styles.infoIcon}>ⓘ</Text>
      </TouchableOpacity>
      {renderMovieDetails()}
    </View>
  );

  return (
    <TouchableWithoutFeedback 
      onPress={handleDoubleTap}
      delayPressIn={0}
      delayPressOut={0}
    >
      <View style={styles.container}>
        {/* Front face */}
        <Animated.View 
          style={[
            styles.cardFace,
            {
              transform: [
                { perspective: 2000 },
                { rotateY: frontInterpolate }
              ],
              opacity: frontOpacity,
              zIndex: isFlipped ? 0 : 1,
            }
          ]}
        >
          <TouchableWithoutFeedback onPress={handleDoubleTap}>
            <View style={styles.frontFaceContainer}>
              {renderFrontFace()}
            </View>
          </TouchableWithoutFeedback>
        </Animated.View>

        {/* Back face */}
        <Animated.View 
          style={[
            styles.cardFace,
            styles.cardBack,
            {
              transform: [
                { perspective: 2000 },
                { rotateY: backInterpolate }
              ],
              opacity: backOpacity,
              zIndex: isFlipped ? 1 : 0,
            }
          ]}
        >
          <MovieReview 
            movie={movie} 
            onDoubleTap={handleDoubleTap}
          />
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    width: DIMS.width,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 0,
    padding: 0,
  },
  cardFace: {
    width: DIMS.width,
    height: CARD_HEIGHT,
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    left: 0,
    top: 0,
  },
  cardBack: {
    backgroundColor: '#FFFFFF',
  },
  frontFaceContainer: {
    flex: 1,
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%', // Use full height
    resizeMode: 'cover',
  },
  infoButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  infoIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Darker overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#1a1a1a', // Dark background
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
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
});

export default FlipCard;
