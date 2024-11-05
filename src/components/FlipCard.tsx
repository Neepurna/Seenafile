// src/components/FlipCard.tsx

import React, { useRef, forwardRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, State, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import MovieReview from './MovieReview';
import { useMovieLists, MovieListProvider } from '../context/MovieListContext';

const { width, height } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 100; // Match with Tabs.tsx
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 0;
const CARD_PADDING = 16; // Add padding around the card

// Calculate dimensions for a more square-ish card that maintains movie poster aspect ratio (2:3)
const CARD_WIDTH = width - (CARD_PADDING * 2);
const CARD_HEIGHT = (CARD_WIDTH * 1.5); // 2:3 aspect ratio common for movie posters

interface Genre {
  id: number;
  name: string;
}

interface FlipCardProps {
  movie: {
    id: number;
    title: string;
    poster_path: string;
    vote_average: number;
    overview: string;
    release_date: string;
    runtime: number;
    genres: Genre[];
    // Add other detailed fields if needed
  };
  setSwipingEnabled: (enabled: boolean) => void;
  onSwipeComplete?: () => void; // Add this prop
}

const FlipCard = forwardRef<View, FlipCardProps>((props, ref) => {
  const { movie, setSwipingEnabled, onSwipeComplete } = props;
  const { addMovieToList } = useMovieLists(); // Only use addMovieToList
  const [flipped, setFlipped] = React.useState(false);
  const flipAnim = React.useRef(new Animated.Value(0)).current;
  const lastTap = React.useRef<number | null>(null);

  // Handle double-tap to flip the card
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    
    if (lastTap.current && now - lastTap.current < DOUBLE_PRESS_DELAY) {
      // Double tap detected
      flipCard();
      lastTap.current = null; // Reset last tap
    } else {
      lastTap.current = now;
    }
  };

  // Flip the card
  const flipCard = () => {
    if (flipped) {
      // Flipping back to front
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setFlipped(false);
        setSwipingEnabled(true); // Enable swiping after animation completes
      });
    } else {
      // Flipping to back
      Animated.timing(flipAnim, {
        toValue: 180,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setFlipped(true);
        setSwipingEnabled(false); // Disable swiping after animation completes
      });
    }
  };

  const handleSwipe = (direction) => {
    if (!movie) return; // Guard against undefined movie
    
    switch (direction) {
      case 'up':
        addMovieToList('mostWatch', movie);
        break;
      case 'right':
        addMovieToList('watchLater', movie);
        break;
      case 'left':
        addMovieToList('seen', movie);
        break;
    }
    setSwipingEnabled(true);
    onSwipeComplete?.(); // Call onSwipeComplete after handling the swipe
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  };

  const imageUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;

  return (
    <GestureHandlerRootView style={styles.container}>
      <Animated.View 
        ref={ref}
        style={[styles.cardContainer, flipped && styles.noGestures]}
      >
        {/* Front Side - Only Poster */}
        <Animated.View
          style={[styles.flipCard, frontAnimatedStyle]}
          pointerEvents={flipped ? 'none' : 'auto'}
        >
          <Image source={{ uri: imageUrl }} style={styles.poster} />
        </Animated.View>

        {/* Back Side */}
        <Animated.View
          style={[styles.flipCard, styles.flipCardBack, backAnimatedStyle]}
          pointerEvents={flipped ? 'auto' : 'none'}
        >
          <MovieReview movie={movie} />
        </Animated.View>

        {/* Overlay */}
        {flipped && (
          <View style={styles.overlay} pointerEvents="auto">
            <TouchableWithoutFeedback onPress={handleDoubleTap}>
              <View style={styles.overlayContent} />
            </TouchableWithoutFeedback>
          </View>
        )}
      </Animated.View>
    </GestureHandlerRootView>
  );
});

// Add display name for debugging
FlipCard.displayName = 'FlipCard';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // ...existing cardContainer styles...
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#000000',
    overflow: 'hidden',
    alignSelf: 'center',
    justifyContent: 'center',
    marginHorizontal: CARD_PADDING,
    marginVertical: CARD_PADDING,
    borderRadius: 20,
    position: 'absolute',
    left: (width - CARD_WIDTH) / 2 - CARD_PADDING, // Center horizontally
    top: (height - CARD_HEIGHT) / 2 - TAB_BAR_HEIGHT / 2, // Center vertically accounting for tab bar
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  flipCard: {
    backfaceVisibility: 'hidden', // Hide back side when flipped
    width: CARD_WIDTH,             // Full width of container
    height: CARD_HEIGHT,            // Full height of container
    position: 'absolute',      // Position absolutely within container
    left: 0,                  // Align to left edge
    top: 0,                   // Align to top edge
    margin: 0,
    padding: 0,
    borderRadius: 20, // Match container border radius
    overflow: 'hidden', // Ensure image respects border radius
  },
  flipCardBack: {
    top: 0,                   // Align to top edge
  },
  poster: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    resizeMode: 'cover',  // Changed to 'cover' to fill the space
    margin: 0,
    padding: 0,
    borderRadius: 20, // Match container border radius
  },
  overlay: {
    ...StyleSheet.absoluteFillObject, // Fill parent container
    backgroundColor: 'transparent', // Invisible background
    zIndex: 9999,             // Stay on top of other elements
  },
  overlayContent: {
    flex: 1,                  // Take up all available space
  },
  noGestures: {
    transform: [{ scale: 1 }], // Prevent scaling
    elevation: 999,           // Stay on top (Android)
  },
});

export default FlipCard;
