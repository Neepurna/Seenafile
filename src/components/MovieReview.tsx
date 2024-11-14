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
  Alert,
} from 'react-native';
import { fetchMovieImages } from '../services/tmdb'; // Add this import at the top with other imports
import { 
  collection, 
  doc, 
  getDoc, 
  addDoc, 
  Timestamp 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { saveReview } from '../firebase'; // Changed from '../config/firebase'
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'ios' ? 100 : 100;
const TAB_BAR_HEIGHT = 100; // Match with Tabs.tsx
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 0;
const SCREEN_HEIGHT = height - TAB_BAR_HEIGHT - HEADER_HEIGHT - STATUS_BAR_HEIGHT;
const FILTER_HEIGHT = 70;
const CARD_HEIGHT = SCREEN_HEIGHT - FILTER_HEIGHT;
const CARD_WIDTH = width;

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
  onDoubleTap?: () => void; // Add this prop
}

interface SharedReview {
  movieId: number;
  movieTitle: string;
  backdrop: string | null;
  rating: number;
  review: string;
  userId: string;
  username: string;
  timestamp: Timestamp;
  likes: number;
}

const MovieReview: React.FC<MovieReviewProps> = ({ movie, onDoubleTap }) => {
  const [backdrops, setBackdrops] = useState<Backdrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  // Remove isPublic state

  useEffect(() => {
    const loadSavedReview = async () => {
      try {
        const savedReview = await AsyncStorage.getItem(`review_${movie.id}`);
        if (savedReview) {
          const { rating: savedRating, text: savedText, isPublic: savedIsPublic } = JSON.parse(savedReview);
          setRating(savedRating);
          setReview(savedText);
        }
      } catch (error) {
        console.error('Error loading saved review:', error);
      }
    };

    loadSavedReview();

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

  const validateReview = () => {
    if (!rating || rating < 1) {
      Alert.alert('Error', 'Please add a rating');
      return false;
    }
    if (!review.trim()) {
      Alert.alert('Error', 'Please write a review');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    try {
      if (!validateReview()) return;

      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Error', 'Please sign in to save reviews');
        return;
      }

      const reviewData = {
        movieId: movie.id,
        movieTitle: movie.title,
        rating,
        review: review.trim(),
        isPublic: true,
        userId,
        createdAt: Timestamp.now()
      };

      // Add directly to Firestore
      await addDoc(collection(db, 'reviews'), reviewData);

      // Save to AsyncStorage
      await AsyncStorage.setItem(`review_${movie.id}`, JSON.stringify({
        rating,
        text: review,
        isPublic: true
      }));

      Alert.alert('Success', 'Your review has been saved!');
    } catch (error) {
      console.error('Error saving review:', error);
      Alert.alert('Error', 'Failed to save your review. Please try again.');
    }
  };

  const handleShare = async () => {
    try {
      if (!validateReview()) return;

      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Error', 'Please sign in to share reviews');
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', userId));
      const username = userDoc.data()?.displayName || 'Anonymous';

      const sharedReview: SharedReview = {
        movieId: movie.id,
        movieTitle: movie.title,
        backdrop: backdrops[0]?.file_path || null,
        rating,
        review: review.trim(),
        userId,
        username,
        timestamp: Timestamp.now(),
        likes: 0
      };

      const docRef = await addDoc(collection(db, 'sharedReviews'), sharedReview);
      
      if (docRef.id) {
        Alert.alert('Success', 'Your review has been shared to CineWall!');
      } else {
        throw new Error('Failed to get document reference');
      }
    } catch (error) {
      console.error('Error sharing review:', error);
      Alert.alert('Error', 'Failed to share your review. Please try again.');
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

  const handleContentPress = () => {
    Keyboard.dismiss();
    // Wait a bit before handling double tap to avoid conflicts
    setTimeout(() => {
      if (onDoubleTap) onDoubleTap();
    }, 10);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={24} color="#ffffff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="never"
            bounces={false}
          >
            <TouchableWithoutFeedback onPress={handleContentPress}>
              <View style={styles.contentContainer}>
                {/* Backdrop Image */}
                {backdrops.length > 0 && (
                  <View style={styles.backdropContainer}>
                    <Image
                      source={{ uri: `https://image.tmdb.org/t/p/w780${backdrops[0].file_path}` }}
                      style={styles.backdropImage}
                    />
                  </View>
                )}

                {/* Title - removed Report Card */}
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

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={handleShare}
                  >
                    <Text style={styles.buttonText}>Share</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.saveButton]}
                    onPress={handleSave}
                  >
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 0, // Remove border radius
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
  contentContainer: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flexGrow: 1,
  },
  movieTitle: {
    fontSize: 20, // Slightly larger since it's now the main title
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
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
    marginBottom: 16,
    flex: 1, // Allow review container to flex
  },
  reviewInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    minHeight: 150, // Increased from 80
    maxHeight: 200, // Increased from 120
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0, // Add padding for iOS
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
    marginBottom: 16,
  },
  backdropImage: {
    width: CARD_WIDTH - 32,
    height: (CARD_WIDTH - 32) * 0.4, // Made slightly shorter
    resizeMode: 'cover',
    borderRadius: 8,
  },
});

export default MovieReview;
