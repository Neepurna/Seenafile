import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Animated,
  Platform,
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

const { width } = Dimensions.get('window');
const CARD_PADDING = 16;
const CARD_WIDTH = width - (CARD_PADDING * 2);
const CARD_HEIGHT = (CARD_WIDTH * 1.5);

const FlipCard: React.FC<FlipCardProps> = ({ movie, onSwipingStateChange }) => {
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
    onSwipingStateChange(!isFlipped); // Invert current state immediately

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
          <Image 
            source={{ uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` }}
            style={styles.poster}
          />
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
  poster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});

export default FlipCard;
