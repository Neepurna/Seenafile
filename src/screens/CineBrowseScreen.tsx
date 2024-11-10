// src/screens/CineBrowseScreen.tsx

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Dimensions, Platform, Text } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import FlipCard from '../components/FlipCard';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Movie } from '../services/api';
import { fetchRandomMovies, shuffleArray } from '../services/helper';
import { auth, db } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 67; // Match new tab bar height
const HEADER_HEIGHT = Platform.OS === 'ios' ? 44 : 56; // Standard header heights
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : 0;
const SCREEN_HEIGHT = height - TAB_BAR_HEIGHT - HEADER_HEIGHT - STATUS_BAR_HEIGHT;

interface Genre {
  label: string;
  id: number;
}

const genres: Genre[] = [
  { label: 'Action', id: 28 },
  { label: 'Adventure', id: 12 },
  // ... (rest of the genres)
];

const MAX_PAGE = 500; // Maximum page number allowed by TMDB API

type RootStackParamList = {
  CineBrowse: undefined;
  MovieReview: { movie: Movie };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'CineBrowse'>;

const CineBrowseScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [swipingEnabled, setSwipingEnabled] = useState(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const displayedMovieIds = useRef<Set<number>>(new Set());

  const initialGenrePages: { [key: number]: number } = {};
  genres.forEach((genre) => {
    initialGenrePages[genre.id] = 1;
  });
  const [genrePages, setGenrePages] = useState<{ [key: number]: number }>(initialGenrePages);

  const [topRatedPage, setTopRatedPage] = useState(1);
  const [highestRatedPage, setHighestRatedPage] = useState(1);

  useEffect(() => {
    fetchMoreMovies();
  }, []);

  const fetchMoreMovies = async () => {
    if (isFetching) return;
    
    try {
      setIsFetching(true);
      setLoading(true);

      const [popularMovies, topRatedMovies, highestVotedMovies] = await Promise.all([
        fetchRandomMovies('popular', 10),
        fetchRandomMovies('top_rated', 10),
        fetchRandomMovies('discover', 10, {
          sort_by: 'vote_count.desc',
          'vote_count.gte': 1000,
          with_original_language: 'en' // Add language filter for better results
        })
      ]);

      // Filter out any undefined/null results
      const validMovies = [
        ...(popularMovies || []).map(m => ({ ...m, category: 'Popular' })),
        ...(topRatedMovies || []).map(m => ({ ...m, category: 'Highest Rated' })),
        ...(highestVotedMovies || []).map(m => ({ ...m, category: 'Most Voted' }))
      ].filter(movie => 
        movie && 
        movie.poster_path && 
        !displayedMovieIds.current.has(movie.id)
      );

      if (validMovies.length === 0) {
        console.warn('No new movies fetched');
        return;
      }

      setMovies(prevMovies => [...prevMovies, ...shuffleArray(validMovies)]);
      validMovies.forEach(movie => displayedMovieIds.current.add(movie.id));

    } catch (error) {
      console.error('Error fetching more movies:', error);
      Alert.alert('Error', 'Failed to load more movies. Please try again.');
    } finally {
      setIsFetching(false);
      setLoading(false);
    }
  };

  const flattenAndFilterResponses = (responses: any[]) => {
    const moviesArray: Movie[] = [];
    responses.forEach((response) => {
      if (response && response.results) {
        const filteredMovies = filterNewMovies(response.results);
        moviesArray.push(...filteredMovies);
      }
    });
    return moviesArray;
  };

  const filterNewMovies = (moviesArray: Movie[]) => {
    return moviesArray.filter((movie) => {
      if (movie.poster_path && !displayedMovieIds.current.has(movie.id)) {
        return true;
      }
      return false;
    });
  };

  const saveMovieToFirestore = async (movie: Movie, category: string) => {
    if (!auth.currentUser) return;
  
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const movieRef = doc(collection(userRef, 'movies'), movie.id.toString());
  
      // First, check if the movie already exists
      const movieDoc = await getDoc(movieRef);
      if (movieDoc.exists()) {
        // Movie already exists, skip saving
        return;
      }
  
      // Save movie with all required fields
      await setDoc(movieRef, {
        movieId: movie.id.toString(),
        title: movie.title,
        poster_path: movie.poster_path,
        category,
        timestamp: new Date()
      });
  
      // Skip separate stats update since CineFileScreen's onSnapshot will handle it
    } catch (error) {
      if (error.code === 'permission-denied') {
        // Ignore permission errors since the operation actually succeeded
        return;
      }
      console.error('Error saving movie:', error);
    }
  };

  const handleSwipedRight = async (index: number) => {
    await saveMovieToFirestore(movies[index], 'watched');
  };

  const handleSwipedLeft = (index: number) => {
    
  };

  const handleSwipedTop = async (index: number) => {
    await saveMovieToFirestore(movies[index], 'most_watch');
  };

  const handleSwipedBottom = async (index: number) => {
    await saveMovieToFirestore(movies[index], 'watch_later');
  };

  const handleMovieReview = (movie: Movie) => {
    navigation.navigate('MovieReview', { movie });
  };

  const handleSwiped = (index: number) => {
    setCurrentIndex(index + 1);
    
    // Pre-fetch more cards when we're running low
    if (movies.length - (index + 1) <= 5) {
      fetchMoreMovies();
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Swiper
          cards={movies}
          renderCard={(movie) => {
            if (!movie) return null;
            return (
              <FlipCard
                movie={movie}
                onSwipingStateChange={setSwipingEnabled}
              />
            );
          }}
          infinite={false}
          backgroundColor="transparent"
          cardVerticalMargin={0}
          cardHorizontalMargin={0}
          stackSize={3}
          stackScale={10}
          stackSeparation={14}
          overlayOpacityHorizontalThreshold={width / 8}
          overlayOpacityVerticalThreshold={SCREEN_HEIGHT / 8}
          inputRotationRange={[-width / 2, 0, width / 2]}
          outputRotationRange={["-10deg", "0deg", "10deg"]}
          onSwipedAll={() => {
            setCurrentIndex(0);
            fetchMoreMovies();
          }}
          onSwipedTop={handleSwipedTop}
          onSwipedBottom={handleSwipedBottom}
          onSwipedRight={handleSwipedRight}
          onSwipedLeft={handleSwipedLeft}
          onSwiped={handleSwiped}
          cardIndex={currentIndex}
          verticalSwipe={swipingEnabled}
          horizontalSwipe={swipingEnabled}
          disableTopSwipe={!swipingEnabled}
          disableBottomSwipe={!swipingEnabled}
          disableLeftSwipe={!swipingEnabled}
          disableRightSwipe={!swipingEnabled}
          verticalThreshold={SCREEN_HEIGHT / 6}
          horizontalThreshold={width / 6}
          useViewOverflow={false}
          preventSwiping={['up', 'down', 'left', 'right']}
          swipeBackCard={false}
          overlayLabels={swipingEnabled ? {
            left: {
              element: (
                <View style={[styles.overlayWrapper, { borderColor: '#FF4B4B' }]}>
                  <View>
                    <Ionicons name="close-circle" size={40} color="#FF4B4B" />
                  </View>
                  <View>
                    <Text style={[styles.overlayText, { color: '#FF4B4B' }]}>
                      Not Watched
                    </Text>
                  </View>
                </View>
              )
            },
            right: {
              element: (
                <View style={[styles.overlayWrapper, { borderColor: '#4BFF4B' }]}>
                  <View>
                    <Ionicons name="checkmark-circle" size={40} color="#4BFF4B" />
                  </View>
                  <View>
                    <Text style={[styles.overlayText, { color: '#4BFF4B' }]}>
                      Watched
                    </Text>
                  </View>
                </View>
              )
            },
            top: {
              element: (
                <View style={[styles.overlayWrapper, { borderColor: '#FFD700' }]}>
                  <View>
                    <Ionicons name="repeat" size={40} color="#FFD700" />
                  </View>
                  <View>
                    <Text style={[styles.overlayText, { color: '#FFD700' }]}>
                      Most Watch
                    </Text>
                  </View>
                </View>
              )
            },
            bottom: {
              element: (
                <View style={[styles.overlayWrapper, { borderColor: '#00BFFF' }]}>
                  <View>
                    <Ionicons name="time" size={40} color="#00BFFF" />
                  </View>
                  <View>
                    <Text style={[styles.overlayText, { color: '#00BFFF' }]}>
                      Watch Later
                    </Text>
                  </View>
                </View>
              )
            },
          } : undefined}
          swipeAnimationDuration={swipingEnabled ? 350 : 0}
          animateCardOpacity={true}
          containerStyle={styles.swiperContainer}
          cardStyle={styles.cardStyle}
        />
        {(loading || isFetching) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  swiperContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: SCREEN_HEIGHT * 0.05, // Add some bottom padding for visual balance
  },
  cardWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: width,
    height: SCREEN_HEIGHT,
  },
  cardStyle: {
    height: SCREEN_HEIGHT * 0.9, // Match FlipCard height
    width: width - 32,
    alignSelf: 'center',
    justifyContent: 'center',
    margin: 0,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
  },
  overlayWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -75 }, { translateY: -50 }],
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 2,
    borderRadius: 15,
    width: 150,
    height: 100,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  overlayText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default CineBrowseScreen;
