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

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? 100 : 100;
const TAB_BAR_HEIGHT = 100;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 0;
const SEARCH_BAR_HEIGHT = 70;
const AVAILABLE_HEIGHT = height - HEADER_HEIGHT - TAB_BAR_HEIGHT - STATUS_BAR_HEIGHT - SEARCH_BAR_HEIGHT;
const CARD_WIDTH = width - 32;
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      style={styles.container}
    >
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

          <TextInput
            style={styles.reviewInput}
            multiline
            placeholder="Share your thoughts..."
            placeholderTextColor="#666"
            value={review}
            onChangeText={setReview}
            maxLength={500}
          />
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
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    overflow: 'hidden',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollContent: {
    padding: 20,
  },
  reviewHeader: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  movieTitle: {
    fontSize: 20,
    color: '#ccc',
    marginBottom: 15,
  },
  reviewInput: {
    color: '#fff',
    fontSize: 16,
    height: CARD_HEIGHT * 0.25, // Adjust text input height
    textAlignVertical: 'top',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  ratingContainer: {
    alignItems: 'center',
  },
  reviewActions: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#1a1a1a',
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
    color: '#444',
  },
  starFilled: {
    color: '#FFD700',
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
