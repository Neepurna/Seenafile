// src/components/FlipCard.tsx

import React, { useState, useRef } from 'react';
import {
  Animated,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import MovieCard from './MovieCard'; // Adjust the import path
import MovieReview from './MovieReview'; // Adjust the import path

const { width, height } = Dimensions.get('window');

interface FlipCardProps {
  movie: {
    id: number;
    title: string;
    poster_path: string;
    vote_average: number;
    overview: string;
  };
  setSwipingEnabled: (enabled: boolean) => void;
}

const FlipCard: React.FC<FlipCardProps> = ({ movie, setSwipingEnabled }) => {
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const lastTap = useRef<number | null>(null);

  // Flip the card
  const flipCard = () => {
    if (flipped) {
      // Flip back
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setFlipped(false);
        setSwipingEnabled(true); // Enable swiping
      });
    } else {
      // Flip front
      Animated.timing(flipAnim, {
        toValue: 180,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setFlipped(true);
        setSwipingEnabled(false); // Disable swiping
      });
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300; // milliseconds
    if (lastTap.current && now - lastTap.current < DOUBLE_PRESS_DELAY) {
      flipCard();
    } else {
      lastTap.current = now;
    }
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

  return (
    <TouchableWithoutFeedback onPress={handleDoubleTap}>
      <View style={styles.cardContainer}>
        {/* Front Side */}
        <Animated.View style={[styles.flipCard, frontAnimatedStyle]}>
          <MovieCard movie={movie} />
        </Animated.View>
        {/* Back Side */}
        <Animated.View
          style={[styles.flipCard, styles.flipCardBack, backAnimatedStyle]}
        >
          <MovieReview movie={movie} />
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: width * 0.85,
    height: height * 0.85,
  },
  flipCard: {
    backfaceVisibility: 'hidden',
    width: '100%',
    height: '100%',
  },
  flipCardBack: {
    position: 'absolute',
    top: 0,
  },
});

export default FlipCard;
