// src/components/MovieReview.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
  ScrollView,
  Text,
  Platform,
  TextInput,
  TouchableOpacity,
  Share,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { fetchMovieImages } from '../services/tmdb'; // Add this import at the top with other imports

const { width, height } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 100; // Match with Tabs.tsx
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 0;

// Match CARD_HEIGHT exactly with FlipCard
const CARD_PADDING = 16;
const CARD_WIDTH = width - (CARD_PADDING * 2);
const CARD_HEIGHT = (CARD_WIDTH * 1.5);

interface Backdrop {
  file_path: string;
}

interface MovieReviewProps {
  movie: {
    id: number;
    title: string;
    vote_average: number;
    vote_count: number; // Add this line
    genres: { id: number; name: string }[];
    release_date?: string;
    runtime?: number;
    overview?: string;
  };
}

const MovieReview: React.FC<MovieReviewProps> = ({ movie }) => {
  const [backdrops, setBackdrops] = useState<Backdrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const imagesData = await fetchMovieImages(movie.id);
        setBackdrops(imagesData.backdrops.slice(0, 1)); // Limit to 1 image
      } catch (error) {
        console.error('Error fetching movie images:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [movie.id]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my review of ${movie.title}!\nRating: ${rating}/5\nReview: ${review}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
          >
            <Text style={[styles.star, rating >= star ? styles.starFilled : styles.starEmpty]}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.contentContainer}>
            {/* Header */}
            <Text style={styles.headerTitle}>Report Card</Text>
            <Text style={styles.movieTitle}>{movie.title}</Text>
            
            {/* Rating Stars */}
            {renderStars()}

            {/* Review Input */}
            <View style={styles.reviewContainer}>
              <TextInput
                style={styles.reviewInput}
                multiline
                placeholder="Write your review here..."
                placeholderTextColor="#999"
                value={review}
                onChangeText={setReview}
              />
            </View>

            {/* Backdrop Image */}
            {backdrops.length > 0 && (
              <View style={styles.backdropContainer}>
                <Image
                  source={{ uri: `https://image.tmdb.org/t/p/w780${backdrops[0].file_path}` }}
                  style={styles.backdropImage}
                />
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setIsPublic(!isPublic)}
              >
                <Text style={styles.buttonText}>
                  {isPublic ? '🌎 Public' : '🔒 Private'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleShare}
              >
                <Text style={styles.buttonText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.saveButton]}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  contentContainer: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flexGrow: 1,
  },
  movieTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  star: {
    fontSize: 40,
    marginHorizontal: 5,
  },
  starEmpty: {
    color: '#666',
  },
  starFilled: {
    color: '#FFD700',
  },
  reviewContainer: {
    marginVertical: 15,
  },
  reviewInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    height: 120,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: '#444',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backdropContainer: {
    width: '100%',
    marginVertical: 15,
  },
  backdropImage: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 0.6,
    resizeMode: 'cover',
  },
});

export default MovieReview;
