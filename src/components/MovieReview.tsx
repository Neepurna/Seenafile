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
const CARD_HEIGHT = height * 0.75;

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
    <View style={styles.container}>
      <View style={styles.reviewHeader}>
        <Text style={styles.title}>Write a Review</Text>
        <Text style={styles.movieTitle}>{movie.title}</Text>
      </View>
      
      <TextInput
        style={styles.reviewInput}
        multiline
        placeholder="Share your thoughts..."
        placeholderTextColor="#666"
        value={review}
        onChangeText={setReview}
      />

      <View style={styles.ratingContainer}>
        {renderStars()}
      </View>

      <View style={styles.reviewActions}>
        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handlePost}
          disabled={isSubmitting}
        >
          <Text style={styles.buttonText}>{isSubmitting ? 'Posting...' : 'Post Review'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    justifyContent: 'space-between',
    backgroundColor: '#000',
  },
  reviewHeader: {
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  movieTitle: {
    fontSize: 18,
    color: '#ccc',
    marginBottom: 15,
  },
  reviewInput: {
    color: '#fff',
    fontSize: 16,
    height: CARD_HEIGHT * 0.4,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  ratingContainer: {
    marginBottom: 15,
  },
  reviewActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  starButton: {
    padding: 5, // Add padding for better touch target
  },
  star: {
    fontSize: 40, // Increased size for better visibility
    marginHorizontal: 8, // Increased spacing between stars
  },
  starEmpty: {
    color: '#444',
  },
  starFilled: {
    color: '#FFD700',
  },
  button: {
    backgroundColor: '#FF4081',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 25,
    width: '100%',
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default MovieReview;
