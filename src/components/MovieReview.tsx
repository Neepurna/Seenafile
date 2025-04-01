import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  Keyboard,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchMovieCredits } from '../services/tmdb';
import CastList from './CastList';

const { width, height } = Dimensions.get('window');
const CARD_PADDING = 16;
const CARD_WIDTH = width - (CARD_PADDING * 2);
const CARD_HEIGHT = height * 0.75;

interface MovieReviewProps {
  movie: {
    id: number;
    title?: string;
    name?: string;
    backdrop_path: string | null;
    poster_path: string | null;
    overview: string;
    vote_average: number;
    release_date?: string;
    first_air_date?: string;
    media_type?: string;
    original_language?: string;
  };
  onDoubleTap?: () => void;
  onPostReview: (review: string, rating: number) => Promise<void>;
}

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

const MovieReview: React.FC<MovieReviewProps> = ({ 
  movie, 
  onDoubleTap,
  onPostReview 
}) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [isLoadingCast, setIsLoadingCast] = useState(true);
  const [activeTab, setActiveTab] = useState<'info'>('info'); // Change to only info tab

  useEffect(() => {
    loadCast();
  }, [movie.id]);

  const loadCast = async () => {
    try {
      setIsLoadingCast(true);
      const endpoint = movie.media_type === 'tv' ? 'tv' : 'movie';
      const data = await fetchMovieCredits(movie.id, endpoint);
      
      if (data && data.cast) {
        // Take up to 20 cast members instead of 5
        const validCast = data.cast
          .filter(member => member.name && member.character)
          .slice(0, 20);
        setCast(validCast);
      }
    } catch (error) {
      console.error('Error loading cast:', error);
      setCast([]);
    } finally {
      setIsLoadingCast(false);
    }
  };

  const handlePost = async () => {
    if (isSubmitting) return;

    if (!review.trim()) {
      Alert.alert('Error', 'Please write a review before posting');
      return;
    }
    if (rating === 0) {
      Alert.alert('Error', 'Please rate the movie before posting');
      return;
    }

    try {
      setIsSubmitting(true);
      await onPostReview(review, rating);
      setReview('');
      setRating(0);
    } catch (error) {
      console.error('Error posting review:', error);
      Alert.alert('Error', 'Failed to post review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEditing = () => {
    Keyboard.dismiss();
  };

  const renderStars = () => (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => setRating(star)}
          style={styles.starButton}
        >
          <Text style={[styles.star, rating >= star ? styles.starFilled : styles.starEmpty]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderInfoTab = () => (
    <View style={styles.mainContent}>
      <TouchableWithoutFeedback onPress={onDoubleTap}>
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.overview}>{movie.overview || 'No overview available'}</Text>
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.castSection}>
        <Text style={styles.sectionTitle}>Cast</Text>
        <CastList cast={cast} isLoading={isLoadingCast} />
      </View>
    </View>
  );

  const displayTitle = movie.title || movie.name || 'Untitled';
  const releaseDate = movie.release_date || movie.first_air_date || 'Unknown Date';

  return (
    <View style={styles.container}>
      {/* Header with movie info */}
      <View style={styles.cardHeader}>
        <Image
          source={{ 
            uri: movie.backdrop_path 
              ? `https://image.tmdb.org/t/p/w500${movie.backdrop_path}`
              : movie.poster_path
              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
              : 'https://via.placeholder.com/500x300?text=No+Image'
          }}
          style={styles.headerImage}
          blurRadius={3}
        />
        <View style={styles.overlay} />
        
        <View style={styles.movieInfoHeader}>
          <Image 
            source={{ 
              uri: movie.poster_path 
                ? `https://image.tmdb.org/t/p/w92${movie.poster_path}`
                : 'https://via.placeholder.com/92x138?text=No+Image'
            }}
            style={styles.miniPoster}
          />
          <View style={styles.titleContainer}>
            <Text style={styles.movieTitle} numberOfLines={2}>{displayTitle}</Text>
            <View style={styles.ratingBar}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>{movie.vote_average.toFixed(1)}/10</Text>
            </View>
          </View>
        </View>
      </View>

      {renderInfoTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  cardHeader: {
    height: 150,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  movieInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    height: '100%',
  },
  miniPoster: {
    width: 60,
    height: 90,
    borderRadius: 8,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  titleContainer: {
    flex: 1,
  },
  movieTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 2,  // Changed from borderBottomWidth
    borderTopColor: '#FFD700',  // Changed from borderBottomColor
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFD700',
  },
  tabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#1a1a2e',
  },
  contentContainer: {
    flex: 1,
  },
  infoContent: {
    flex: 1,
    padding: 15,
  },
  reviewContent: {
    flex: 1,
    padding: 15,
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
  },
  overview: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -10,
  },
  detailItem: {
    width: '33.33%',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  detailLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  castScroll: {
    marginVertical: 10, // Add vertical spacing
    flexGrow: 0,
  },
  castContentContainer: {
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  noDataText: {
    color: '#999',
    fontStyle: 'italic',
  },
  reviewInstructions: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  starButton: {
    padding: 5,
  },
  star: {
    fontSize: 30,
  },
  starEmpty: {
    color: 'rgba(255,255,255,0.3)',
  },
  starFilled: {
    color: '#FFD700',
  },
  ratingLabel: {
    color: '#999',
    marginTop: 5,
  },
  reviewInputContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    height: 150,
  },
  reviewInput: {
    color: '#fff',
    flex: 1,
    textAlignVertical: 'top',
  },
  characterCount: {
    color: '#999',
    fontSize: 12,
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#FFD700',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  mainContent: {
    flex: 1,
    paddingVertical: 15,
  },
  overviewSection: {
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  castSection: {
    marginBottom: 20,
    paddingLeft: 15,
    height: 140,
  },
});

export default MovieReview;
