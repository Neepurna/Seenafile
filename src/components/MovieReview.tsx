import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from '@react-native-community/blur';
import { getImageUrl } from '../services/instance';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? 100 : 100;
const TAB_BAR_HEIGHT = 100;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 0;
const SEARCH_BAR_HEIGHT = 70;
const AVAILABLE_HEIGHT = height - HEADER_HEIGHT - TAB_BAR_HEIGHT - STATUS_BAR_HEIGHT - SEARCH_BAR_HEIGHT;
const CARD_PADDING = 16;
const CARD_WIDTH = width - (CARD_PADDING * 2);
const CARD_HEIGHT = AVAILABLE_HEIGHT * 0.9;

interface MovieReviewProps {
  movie: {
    id: number;
    title: string;
    backdrop_path: string;
    poster_path: string;
  };
  onDoubleTap?: () => void;
  onPostReview: (review: string, rating: number) => Promise<void>;
}

const MovieReview: React.FC<MovieReviewProps> = ({ 
  movie, 
  onDoubleTap,
  onPostReview 
}) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Background Image with Blur */}
      <Image
        source={{ uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` }}
        style={styles.backgroundImage}
        blurRadius={25}
      />
      <View style={styles.overlay} />

      <View style={styles.innerContainer}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.reviewHeader}>
            <Text style={styles.title}>Write a Review</Text>
            <Text style={styles.movieTitle} numberOfLines={2}>{movie.title}</Text>
          </View>
          
          <View style={styles.ratingContainer}>
            {renderStars()}
          </View>

          <View style={styles.reviewInputContainer}>
            <TextInput
              style={styles.reviewInput}
              multiline
              placeholder="Share your thoughts about the movie..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={review}
              onChangeText={setReview}
              maxLength={500}
            />
            <Text style={styles.characterCount}>
              {review.length}/500
            </Text>
          </View>
        </ScrollView>

        <View style={styles.reviewActions}>
          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handlePost}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? 'Posting...' : 'Post Review'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.95)', // Add darker background
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    height: CARD_HEIGHT, // Ensure inner container matches parent height
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20, // Add padding at bottom for better spacing
  },
  reviewHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  movieTitle: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 15,
    textAlign: 'center',
  },
  reviewInputContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 2,
    marginTop: 20,
  },
  reviewInput: {
    color: '#fff',
    fontSize: 16,
    height: CARD_HEIGHT * 0.2, // Adjust review input height proportionally
    textAlignVertical: 'top',
    padding: 15,
  },
  characterCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'right',
    padding: 8,
  },
  ratingContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 15,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  starButton: {
    padding: 5,
  },
  star: {
    fontSize: 40,
    marginHorizontal: 8,
  },
  starEmpty: {
    color: 'rgba(255,255,255,0.3)',
  },
  starFilled: {
    color: '#FFD700',
  },
  reviewActions: {
    marginTop: 'auto', // Push to bottom
    paddingBottom: Platform.OS === 'ios' ? 20 : 10, // Add padding for different platforms
  },
  button: {
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default MovieReview;
