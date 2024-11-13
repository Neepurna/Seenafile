import { db } from '../firebase';
import { collection, getDocs, getDoc, doc, addDoc } from 'firebase/firestore';

const MATCH_THRESHOLD = 20; // Updated threshold to 20%

interface MovieMatch {
  movieId: string;
  title: string;
  category: string;
  poster_path: string;
  status: string;
  timestamp: Date;
}

interface MatchData {
  user1Id: string;
  user2Id: string;
  score: number;
  commonMovies: MovieMatch[];
  timestamp: Date;
  isNew: boolean;
}

export const calculateMatchScore = async (currentUserId: string, targetUserId?: string) => {
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
      currentUserMovies.docs
        .filter(doc => {
          const data = doc.data();
          return data && data.movieId && data.title && data.category;
        })
        .map(doc => [
          doc.data().movieId,
          { ...doc.data(), id: doc.id }
        ])
    );

    // If targetUserId is provided, only calculate match for that user
    if (targetUserId) {
      const otherUserMoviesRef = collection(db, 'users', targetUserId, 'movies');
      const otherUserMovies = await getDocs(otherUserMoviesRef);
      const userDoc = await getDoc(doc(db, 'users', targetUserId));
      
      if (!userDoc.exists()) return [];

      const commonMovies: MovieMatch[] = [];
      otherUserMovies.forEach(doc => {
        const movieData = doc.data();
        if (movieData?.movieId && currentUserMovieMap.has(movieData.movieId)) {
          commonMovies.push({
            movieId: movieData.movieId,
            title: movieData.title || 'Unknown Movie',
            category: movieData.category || 'watched',
            poster_path: movieData.poster_path || '',
            status: movieData.status || 'watched',
            timestamp: movieData.timestamp || new Date()
          });
        }
      });

      const score = (commonMovies.length / 
        Math.max(currentUserMovies.size, otherUserMovies.size)) * 100;

      // Validate and create match data
      if (score >= 20 && commonMovies.length > 0) {
        const matchData: MatchData = {
          user1Id: currentUserId,
          user2Id: targetUserId,
          score,
          commonMovies,
          timestamp: new Date(),
          isNew: true
        };

        // Double check all required fields are present and valid
        const isValidMatchData = Object.values(matchData).every(value => 
          value !== undefined && value !== null
        ) && matchData.commonMovies.every(movie => 
          movie.movieId && 
          movie.title && 
          movie.category && 
          movie.status && 
          movie.timestamp
        );

        if (isValidMatchData) {
          await addDoc(collection(db, 'matches'), matchData);
        }
      }

      return [{
        userId: targetUserId,
        displayName: userDoc.data()?.name || 'Unknown User',
        photoURL: userDoc.data()?.photoURL || '',
        score,
        commonMovies
      }];
    }

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

            // If score is >= 20%, create a match document
            if (score >= 20) {
              const matchId = [currentUserId, userDoc.id].sort().join('_');
              const matchData: MatchData = {
                user1Id: currentUserId,
                user2Id: userDoc.id,
                score,
                commonMovies,
                timestamp: new Date(),
                isNew: true
              };

              // Double check all required fields are present and valid
              const isValidMatchData = Object.values(matchData).every(value => 
                value !== undefined && value !== null
              ) && matchData.commonMovies.every(movie => 
                movie.movieId && 
                movie.title && 
                movie.category && 
                movie.status && 
                movie.timestamp
              );

              if (isValidMatchData) {
                await addDoc(collection(db, 'matches'), matchData);
              }
            }

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
      .filter(match => match !== null && match.score >= MATCH_THRESHOLD) // Changed threshold
      .sort((a, b) => b.score - a.score);

  } catch (error) {
    console.error('Error in calculateMatchScore:', error);
    throw error;
  }
};