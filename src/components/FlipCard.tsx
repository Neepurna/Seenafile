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
  Modal,
  TouchableOpacity,
  ScrollView,
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
  onSwipingStateChange: (enabled: boolean) => void;
}

const { width, height } = Dimensions.get('window');
const CARD_PADDING = 16;
const CARD_WIDTH = width - (CARD_PADDING * 2);
const CARD_HEIGHT = height * 0.75; // Increased to 75% of screen height
const DETAILS_HEIGHT = 120; // Fixed height for details section

const FlipCard: React.FC<FlipCardProps> = ({ movie, onSwipingStateChange }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const isAnimating = useRef(false);

  useEffect(() => {
    // Update parent component whenever flip state changes
    onSwipingStateChange(!isFlipped);
  }, [isFlipped, onSwipingStateChange]);

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

  const renderMovieDetails = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showInfo}
      onRequestClose={() => setShowInfo(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView>
            <Text style={styles.modalTitle}>{movie.title}</Text>
            <Text style={styles.modalSubtitle}>Released: {movie.release_date}</Text>
            <Text style={styles.modalRating}>Rating: ⭐ {movie.vote_average.toFixed(1)} ({movie.vote_average} votes)</Text>
            {movie.runtime && (
              <Text style={styles.modalText}>Runtime: {movie.runtime} minutes</Text>
            )}
            <Text style={styles.modalSection}>Genres</Text>
            <View style={styles.modalGenres}>
              {movie.genres.map(genre => (
                <Text key={genre.id} style={styles.modalGenre}>{genre.name}</Text>
              ))}
            </View>
            <Text style={styles.modalSection}>Overview</Text>
            <Text style={styles.modalText}>{movie.overview}</Text>
          </ScrollView>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowInfo(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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
      <TouchableOpacity
        style={styles.infoButton}
        onPress={(e) => {
          e.stopPropagation();
          setShowInfo(true);
        }}
      >
        <Text style={styles.infoIcon}>ⓘ</Text>
      </TouchableOpacity>
      {renderMovieDetails()}
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
    justifyContent: 'center',
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
  infoButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  infoIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  modalRating: {
    fontSize: 16,
    marginBottom: 10,
  },
  modalSection: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  modalGenres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  modalGenre: {
    fontSize: 14,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FlipCard;
