import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

interface MovieMatch {
  movieId: string;
  title: string;
  category: string;
  poster_path?: string;
  status?: string;
  timestamp?: Date;
}

export const calculateMatchScore = async (currentUserId: string) => {
  if (!currentUserId) {
    throw new Error('No user ID provided');
  }

  try {
    // Get current user's movies from their collection
    const currentUserMoviesRef = collection(db, 'users', currentUserId, 'movies');
    const currentUserMovies = await getDocs(currentUserMoviesRef);
    
    if (currentUserMovies.empty) {
      return [];
    }

    // Create a map of current user's movies for faster lookup
    const currentUserMovieMap = new Map(
      currentUserMovies.docs.map(doc => [
        doc.data().movieId,
        { ...doc.data(), id: doc.id }
      ])
    );

    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    // Calculate matches
    const matches = await Promise.all(
      usersSnapshot.docs
        .filter(doc => doc.id !== currentUserId)
        .map(async (userDoc) => {
          try {
            // Get other user's movies
            const otherUserMoviesRef = collection(db, 'users', userDoc.id, 'movies');
            const otherUserMovies = await getDocs(otherUserMoviesRef);
            
            // Find common movies
            const commonMovies: MovieMatch[] = [];
            otherUserMovies.forEach(doc => {
              const movieData = doc.data();
              if (currentUserMovieMap.has(movieData.movieId)) {
                commonMovies.push({
                  movieId: movieData.movieId,
                  title: movieData.title,
                  category: movieData.category,
                  poster_path: movieData.poster_path,
                  status: movieData.status,
                  timestamp: movieData.timestamp
                });
              }
            });

            // Calculate match score
            const score = (commonMovies.length / 
              Math.max(currentUserMovies.size, otherUserMovies.size)) * 100;

            return {
              userId: userDoc.id,
              displayName: userDoc.data().displayName || 'Unknown User',
              photoURL: userDoc.data().photoURL,
              score,
              commonMovies
            };
          } catch (error) {
            console.error(`Error processing user ${userDoc.id}:`, error);
            return null;
          }
        })
    );

    return matches
      .filter(match => match !== null && match.score > 0)
      .sort((a, b) => b.score - a.score);

  } catch (error) {
    console.error('Error in calculateMatchScore:', error);
    throw new Error(`Error calculating matches: ${error.message}`);
  }
};