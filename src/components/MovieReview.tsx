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
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchMovieCredits } from '../services/tmdb';

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
  const [activeTab, setActiveTab] = useState<'info' | 'cast'>('info');

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

  const renderCastTab = () => (
    <ScrollView style={styles.castTabContent}>
      <View style={styles.castGrid}>
        {cast.map(member => (
          <View key={member.id} style={styles.castGridItem}>
            <Image 
              source={{
                uri: member.profile_path 
                  ? `https://image.tmdb.org/t/p/w185${member.profile_path}`
                  : 'https://via.placeholder.com/185x278?text=No+Image'
              }}
              style={styles.castGridImage}
            />
            <View style={styles.castGridInfo}>
              <Text style={styles.castGridName} numberOfLines={1}>{member.name}</Text>
              <Text style={styles.castGridCharacter} numberOfLines={2}>{member.character}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderInfoTab = () => (
    <ScrollView style={styles.mainContent}>
      <View style={styles.overviewSection}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <Text style={styles.overview}>{movie.overview || 'No overview available'}</Text>
      </View>

      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailsGrid}>
          {movie.release_date && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Release Date</Text>
              <Text style={styles.detailText}>
                {new Date(movie.release_date).toLocaleDateString()}
              </Text>
            </View>
          )}
          
          {movie.media_type && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailText}>
                {movie.media_type === 'tv' ? 'TV Show' : 'Movie'}
              </Text>
            </View>
          )}

          {movie.vote_average !== undefined && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Rating</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.detailText}>
                  {movie.vote_average.toFixed(1)}/10
                </Text>
              </View>
            </View>
          )}

          {movie.original_language && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Language</Text>
              <Text style={styles.detailText}>
                {movie.original_language.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
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

      {activeTab === 'info' ? renderInfoTab() : renderCastTab()}

      {/* Bottom Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'info' && styles.activeTab]}
          onPress={() => setActiveTab('info')}
        >
          <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>INFO</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'cast' && styles.activeTab]}
          onPress={() => setActiveTab('cast')}
        >
          <Text style={[styles.tabText, activeTab === 'cast' && styles.activeTabText]}>CAST</Text>
        </TouchableOpacity>
      </View>
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
  castCard: {
    width: 90, // Slightly wider
    marginRight: 15,
    alignItems: 'center',
  },
  castImage: {
    width: 70, // Slightly larger
    height: 70, // Slightly larger
    borderRadius: 35,
    marginBottom: 5,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  castName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  castCharacter: {
    color: '#999',
    fontSize: 10,
    textAlign: 'center',
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
    padding: 15,
  },
  overviewSection: {
    marginBottom: 20,
  },
  castSection: {
    marginBottom: 20,
    height: 140,
  },
  castList: {
    flex: 1,
  },
  castContainer: {
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  castCard: {
    width: 90,
    marginRight: 15,
    alignItems: 'center',
  },
  castImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 5,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  tabContent: {
    flex: 1,
    marginBottom: 10,
  },
  castTabContent: {
    flex: 1,
    padding: 10,
  },
  castGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 5,
  },
  castGridItem: {
    width: '23%', // 4 items per row with some spacing
    marginBottom: 15,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  castGridImage: {
    width: '100%',
    aspectRatio: 1, // Make image square
    resizeMode: 'cover',
  },
  castGridInfo: {
    padding: 5,
  },
  castGridName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  castGridCharacter: {
    color: '#999',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  detailsSection: {
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 15,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  detailItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  detailLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  detailText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

export default MovieReview;
