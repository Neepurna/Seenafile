// ...existing imports...
import { auth, db } from './src/firebase';
import { collection, addDoc, doc, serverTimestamp } from 'firebase/firestore';

interface ReviewData {
  backdrop: string;
  createdAt: string;
  isPublic: boolean;
  likes: number;
  movieId: number;
  movieTitle: string;
  rating: number;
  review: string;
  userId: string;
  username: string;
}

const FlipCard: React.FC<FlipCardProps> = ({ movie, onSwipingStateChange }) => {
  // ...existing state and refs...

  const handlePostReview = useCallback(async (reviewText: string, rating: number) => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to post a review');
      return;
    }

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const moviesRef = collection(userRef, 'movies');

      const reviewData = {
        backdrop: movie.backdrop_path || '',
        createdAt: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          timeZoneName: 'short'
        }),
        isPublic: true,
        likes: 0,
        movieId: movie.id,
        movieTitle: movie.title,
        rating: rating,
        review: reviewText,
        userId: auth.currentUser.uid,
        username: auth.currentUser.displayName || 'Anonymous',
        category: 'critics'
      };

      await addDoc(moviesRef, reviewData);

      Alert.alert(
        'Success',
        'Your review has been posted!',
        [{ text: 'OK', onPress: () => performFlip() }]
      );
    } catch (error) {
      console.error('Error posting review:', error);
      Alert.alert('Error', 'Failed to post review. Please try again.');
    }
  }, [movie, performFlip]);

  return (
    <TouchableWithoutFeedback onPress={handleDoubleTap}>
      <View style={styles.container}>
        {/* Front face */}
        <Animated.View style={[styles.cardFace, frontAnimatedStyle]}>
          {renderFrontFace()}
        </Animated.View>

        {/* Back face */}
        <Animated.View style={[styles.cardFace, styles.cardBack, backAnimatedStyle]}>
          <MovieReview 
            movie={movie} 
            onDoubleTap={handleDoubleTap}
            onPostReview={handlePostReview}
          />
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default FlipCard;
