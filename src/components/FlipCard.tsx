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
} from 'react-native';
import MovieReview from './MovieReview';

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  overview: string;
  release_date: string;
  runtime: number;
  genres: { id: number; name: string }[];
}

interface FlipCardProps {
  movie: Movie;
  swipingEnabled: boolean;
  onSwipingStateChange: (enabled: boolean) => void;
}

const { width, height } = Dimensions.get('window');
const CARD_PADDING = 16;
const CARD_WIDTH = width - (CARD_PADDING * 2);
const CARD_HEIGHT = height * 0.75; // Increased to 75% of screen height
const DETAILS_HEIGHT = 120; // Fixed height for details section

const FlipCard: React.FC<FlipCardProps> = ({ movie, swipingEnabled, onSwipingStateChange }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const isAnimating = useRef(false);

  const handleDoubleTap = () => {
    const currentTime = Date.now();
    const tapInterval = currentTime - lastTap.current;
    
    if (tapInterval < 200) { // Shorter delay for more responsive double-tap
      if (!isAnimating.current) {
        performFlip();
      }
      lastTap.current = 0; // Reset after successful double-tap
    } else {
      lastTap.current = currentTime;
    }
  };

  const performFlip = () => {
    if (isAnimating.current) return;
    
    isAnimating.current = true;
    onSwipingStateChange(!isFlipped); // Disable swiping when flipping to back

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
        // Enable swiping when card is back to front face
        if (isFlipped) {
          onSwipingStateChange(true);
        }
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

  const renderFrontFace = () => (
    <View style={styles.frontFaceContainer}>
      <Image 
        source={{ uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` }}
        style={styles.poster}
      />
      <View style={styles.overlay} />
      <View style={styles.detailsContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {movie.title}
        </Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.rating}>⭐ {movie.vote_average.toFixed(1)}</Text>
          <Text style={styles.votes}>({movie.vote_average} votes)</Text>
        </View>
        <View style={styles.genreContainer}>
          {movie.genres.slice(0, 3).map((genre, index) => (
            <Text key={genre.id} style={styles.genre}>
              {genre.name}{index < Math.min(movie.genres.length - 1, 2) ? ' • ' : ''}
            </Text>
          ))}
        </View>
        <Text style={styles.releaseDate}>
          {new Date(movie.release_date).getFullYear()}
        </Text>
      </View>
    </View>
  );

  return (
    <TouchableWithoutFeedback 
      onPress={handleDoubleTap}
      delayPressIn={0}
      delayPressOut={0}
    >
      <View style={styles.container}>
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
          {renderFrontFace()}
        </Animated.View>

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
          <MovieReview movie={movie} />
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    position: 'relative',
    alignSelf: 'center',
    marginTop: height * 0.05, // Reduced top margin to move card up
  },
  cardFace: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
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
    height: CARD_HEIGHT - DETAILS_HEIGHT, // Adjust poster height to leave space for details
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: DETAILS_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  detailsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: DETAILS_HEIGHT,
    padding: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  votes: {
    fontSize: 15, // Increased size
    color: '#cccccc',
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 3,
  },
  genre: {
    fontSize: 16, // Increased size
    color: '#ffffff',
    opacity: 0.9,
  },
  releaseDate: {
    fontSize: 15, // Increased size
    color: '#cccccc',
  },
});

export default FlipCard;
