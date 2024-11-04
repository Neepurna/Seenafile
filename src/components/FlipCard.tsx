// src/components/FlipCard.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Image,
  Text,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { fetchMovieDetails, fetchMovieReviews } from '../services/tmdb';
import MovieReview from './MovieReview';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const lastTap = useRef<number | null>(null);

  // States for infinite scroll
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);

  useEffect(() => {
    // Fetch initial data
    const fetchDetails = async () => {
      try {
        const movieDetails = await fetchMovieDetails(movie.id);
        setDetails(movieDetails);

        // Fetch first page of reviews
        const movieReviews = await fetchMovieReviews(movie.id, 1);
        setReviews(movieReviews.results);
        setPage(1);
        if (movieReviews.page >= movieReviews.total_pages) {
          setHasMoreData(false);
        }
      } catch (error) {
        console.error('Error fetching movie details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [movie.id]);

  // Fetch more data for infinite scroll (reviews)
  const fetchMoreData = async () => {
    if (loadingMore || !hasMoreData) return;

    setLoadingMore(true);
    try {
      const newPage = page + 1;
      const movieReviews = await fetchMovieReviews(movie.id, newPage);

      if (movieReviews.results.length === 0) {
        setHasMoreData(false); // No more data to load
      } else {
        setReviews((prevReviews) => [...prevReviews, ...movieReviews.results]);
        setPage(newPage);
        if (movieReviews.page >= movieReviews.total_pages) {
          setHasMoreData(false);
        }
      }
    } catch (error) {
      console.error('Error fetching more data:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Handle double-tap to flip the card
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300; // milliseconds
    if (lastTap.current && now - lastTap.current < DOUBLE_PRESS_DELAY) {
      flipCard();
    } else {
      lastTap.current = now;
    }
  };

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

  // Enable scrolling within the card and manage swiping
  const handleScrollBegin = () => {
    setSwipingEnabled(false);
  };

  const handleScrollEnd = () => {
    setSwipingEnabled(true);
  };

  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }: any) => {
    const paddingToBottom = 20; // Adjust as needed
    return (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom
    );
  };

  return (
    <TouchableWithoutFeedback onPress={handleDoubleTap}>
      <GestureHandlerRootView style={styles.cardContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        ) : (
          <>
            {/* Front Side */}
            <Animated.View
              style={[styles.flipCard, frontAnimatedStyle]}
              pointerEvents={flipped ? 'none' : 'auto'} // Disable touch events when not visible
            >
              <ScrollView
                style={styles.scrollView}
                onScrollBeginDrag={handleScrollBegin}
                onScrollEndDrag={handleScrollEnd}
                onMomentumScrollEnd={handleScrollEnd}
                scrollEventThrottle={16}
                onScroll={({ nativeEvent }) => {
                  if (isCloseToBottom(nativeEvent)) {
                    fetchMoreData();
                  }
                }}
              >
                {/* Movie Poster */}
                <Image
                  source={{ uri: `https://image.tmdb.org/t/p/w500${details.poster_path}` }}
                  style={styles.poster}
                />

                {/* Movie Title */}
                <Text style={styles.title}>{details.title}</Text>

                {/* Movie Overview */}
                <Text style={styles.overview}>{details.overview}</Text>

                {/* Genres */}
                {details.genres && details.genres.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Genres</Text>
                    <View style={styles.genresContainer}>
                      {details.genres.map((genre: any) => (
                        <View key={genre.id} style={styles.genreBadge}>
                          <Text style={styles.genreText}>{genre.name}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                {/* Runtime and Release Date */}
                <Text style={styles.infoText}>
                  Runtime: {details.runtime} minutes
                </Text>
                <Text style={styles.infoText}>
                  Release Date: {details.release_date}
                </Text>

                {/* Ratings */}
                <Text style={styles.infoText}>
                  Rating: {details.vote_average.toFixed(1)} / 10
                </Text>

                {/* Reviews (Infinite Scroll Section) */}
                <Text style={styles.sectionTitle}>Reviews</Text>
                {reviews.map((review) => (
                  <View key={review.id} style={styles.reviewContainer}>
                    <Text style={styles.reviewAuthor}>{review.author}</Text>
                    <Text style={styles.reviewContent}>{review.content}</Text>
                  </View>
                ))}

                {loadingMore && (
                  <ActivityIndicator size="small" color="#ffffff" />
                )}

                {/* Padding at the bottom */}
                <View style={{ height: 20 }} />
              </ScrollView>
            </Animated.View>

            {/* Back Side (Review Card) */}
            <Animated.View
              style={[styles.flipCard, styles.flipCardBack, backAnimatedStyle]}
              pointerEvents={flipped ? 'auto' : 'none'} // Disable touch events when not visible
            >
              <MovieReview
                movie={movie}
                isFlipped={flipped}
              />
            </Animated.View>
          </>
        )}
      </GestureHandlerRootView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: width * 0.85,
    height: height * 0.75,
    backgroundColor: '#1F1F1F',
    borderRadius: 20,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
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
  scrollView: {
    flex: 1,
  },
  poster: {
    width: '100%',
    height: height * 0.4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    margin: 15,
  },
  overview: {
    fontSize: 16,
    color: '#cccccc',
    marginHorizontal: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginHorizontal: 15,
    marginTop: 15,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 15,
    marginTop: 10,
  },
  genreBadge: {
    backgroundColor: '#333333',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  genreText: {
    color: '#ffffff',
  },
  infoText: {
    fontSize: 16,
    color: '#cccccc',
    marginHorizontal: 15,
    marginBottom: 5,
  },
  reviewContainer: {
    backgroundColor: '#2C2C2C',
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
  },
  reviewAuthor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  reviewContent: {
    fontSize: 14,
    color: '#cccccc',
  },
});

export default FlipCard;
