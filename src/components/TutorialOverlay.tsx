import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Modal,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FlipCard from './FlipCard';

const { width, height } = Dimensions.get('window');
const API_KEY = '559819d48b95a2e3440df0504dea30fd';

const TutorialOverlay = ({ visible, onClose }) => {
  const [step, setStep] = useState(0);
  const [tutorialMovies, setTutorialMovies] = useState<any[]>([]);
  const pan = useRef(new Animated.ValueXY()).current;
  const textOpacity = useRef(new Animated.Value(1)).current;

  const tutorials = [
    {
      text: "Swipe right to add movies you've watched",
      icon: "checkmark-circle",
      allowedGesture: 'right'
    },
    {
      text: "Swipe left for movies you're not interested in",
      icon: "close-circle",
      allowedGesture: 'left'
    },
    {
      text: "Swipe up for must-watch movies",
      icon: "star",
      allowedGesture: 'up'
    },
    {
      text: "Swipe down to save for later",
      icon: "time",
      allowedGesture: 'down'
    },
    {
      text: "Double tap to see movie details and write review",
      icon: "information-circle",
      allowedGesture: 'double-tap'
    }
  ];

  // Fetch multiple movies for the tutorial
  useEffect(() => {
    const fetchTutorialMovies = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=en-US&page=1`
        );
        const data = await response.json();
        const movies = data.results.slice(0, 5).map(movie => ({
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          vote_average: movie.vote_average,
          overview: movie.overview,
          release_date: movie.release_date,
          media_type: 'movie'
        }));
        setTutorialMovies(movies);
      } catch (error) {
        console.error('Error fetching tutorial movies:', error);
      }
    };

    if (visible) {
      fetchTutorialMovies();
    }
  }, [visible]);

  const handleSwiped = React.useCallback((direction: string) => {
    const currentTutorial = tutorials[step];
    if (currentTutorial.allowedGesture === direction) {
      if (step < tutorials.length - 1) {
        setStep(step + 1);
      } else {
        onClose();
      }
    }
  }, [step, tutorials, onClose]);

  // Add panResponder setup
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gesture) => {
          const currentTutorial = tutorials[step];
          
          // Only allow movement in the direction being taught
          if (currentTutorial.allowedGesture === 'left' || currentTutorial.allowedGesture === 'right') {
            pan.x.setValue(gesture.dx);
          } else if (currentTutorial.allowedGesture === 'up' || currentTutorial.allowedGesture === 'down') {
            pan.y.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          const currentTutorial = tutorials[step];
          const SWIPE_THRESHOLD = 120;

          if (currentTutorial.allowedGesture === 'right' && gesture.dx > SWIPE_THRESHOLD) {
            handleSwiped('right');
          } else if (currentTutorial.allowedGesture === 'left' && gesture.dx < -SWIPE_THRESHOLD) {
            handleSwiped('left');
          } else if (currentTutorial.allowedGesture === 'up' && gesture.dy < -SWIPE_THRESHOLD) {
            handleSwiped('up');
          } else if (currentTutorial.allowedGesture === 'down' && gesture.dy > SWIPE_THRESHOLD) {
            handleSwiped('down');
          }

          // Reset position if swipe wasn't successful
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
        },
      }),
    [step, pan, handleSwiped] // Add dependencies
  );

  // Reset pan value when step changes
  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
  }, [step, pan]);

  if (!tutorialMovies.length) {
    return null;
  }

  // Update return statement to use PanResponder
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.cardContainer,
              {
                transform: [
                  { translateX: pan.x },
                  { translateY: pan.y }
                ]
              }
            ]}
            {...panResponder.panHandlers}
          >
            <FlipCard 
              movie={tutorialMovies[step]}
              onSwipingStateChange={() => {}}
            />
          </Animated.View>

          <View style={styles.tutorialText}>
            <Ionicons name={tutorials[step].icon} size={24} color="#fff" />
            <Text style={styles.text}>{tutorials[step].text}</Text>
          </View>

          <TouchableOpacity style={styles.skipButton} onPress={onClose}>
            <Text style={styles.skipText}>Skip Tutorial</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    width: width * 0.8,
    height: height * 0.6,
    alignItems: 'center',
  },
  tutorialText: {
    position: 'absolute',
    top: 120, // Move to top of screen
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '90%',
    alignSelf: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  skipButton: {
    position: 'absolute',
    bottom: 40,
    padding: 15,
  },
  skipText: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.8,
  },
});

export default TutorialOverlay;
