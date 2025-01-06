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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Image
            source={{ uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` }}
            style={styles.posterImage}
          />
          
          <Text style={styles.movieTitle}>{movie.title}</Text>
          
          <Text style={styles.ratingLabel}>Your Rating</Text>
          {renderStars()}
          
          <Text style={styles.reviewLabel}>Your Review</Text>
          <TextInput
            style={styles.reviewInput}
            multiline
            placeholder="Write your review here..."
            placeholderTextColor="#666"
            value={review}
            onChangeText={setReview}
          />

          <TouchableOpacity
            style={[styles.postButton, isSubmitting && styles.postButtonDisabled]}
            onPress={handlePost}
            disabled={isSubmitting}
          >
            <Ionicons name="paper-plane" size={24} color="#FFF" />
            <Text style={styles.postButtonText}>
              {isSubmitting ? 'Posting...' : 'Post Review'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    width: '100%',
    height: '100%',
  },
  reviewCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 15,
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  posterImage: {
    width: width * 0.5,
    height: height * 0.3,
    borderRadius: 10,
    marginBottom: 20,
  },
  movieTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  ratingLabel: {
    fontSize: 18,
    color: '#FFF',
    marginBottom: 10,
    alignSelf: 'flex-start',
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
  reviewLabel: {
    fontSize: 18,
    color: '#FFF',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  reviewInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 15,
    color: '#FFF',
    width: '100%',
    minHeight: 150,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  postButton: {
    backgroundColor: '#FF4081',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 25,
    width: '100%',
    marginBottom: 20,
  },
  postButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
});

export default MovieReview;
