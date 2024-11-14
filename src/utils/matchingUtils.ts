// matchingutils.ts

import { db } from '../firebase';
import {
  collection,
  getDocs,
  QueryDocumentSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import { MovieMatch, Match } from '../types/matching'; // Verify this path and exports
import { auth } from '../firebase'; // Import auth to check authentication state

const MATCH_THRESHOLD = 20;

// Helper functions
const findCommonMovies = (
  userMovies: QueryDocumentSnapshot[],
  targetMovies: QueryDocumentSnapshot[]
): MovieMatch[] => {
  const userMovieMap = new Map(
    userMovies.map((doc) => [doc.data().movieId, { ...doc.data(), id: doc.id }])
  );

  return targetMovies
    .map((doc) => {
      const targetMovie = doc.data();
      const userMovie = userMovieMap.get(targetMovie.movieId);

      if (userMovie) {
        return {
          movieId: targetMovie.movieId,
          title: targetMovie.title,
          category: targetMovie.category,
          poster_path: targetMovie.poster_path,
          status: targetMovie.status,
          timestamp: targetMovie.timestamp?.toDate() || new Date(),
        };
      }
      return null;
    })
    .filter((movie): movie is MovieMatch => movie !== null);
};

const calculateScore = (commonMovies: MovieMatch[]): number => {
  if (commonMovies.length === 0) return 0;

  // Base score from number of movies in common
  const baseScore = Math.min(commonMovies.length * 10, 100);

  // Additional score for matching categories
  const categoryMatches = commonMovies.reduce((acc, movie) => {
    if (movie.category === 'favorites' || movie.category === 'most_watch') {
      return acc + 5;
    }
    return acc;
  }, 0);

  // Combine scores and cap at 100
  const totalScore = Math.min(baseScore + categoryMatches, 100);

  return totalScore;
};

export const calculateMatchScore = async (): Promise<Match[]> => {
  const userId = auth.currentUser?.uid;

  if (!userId) {
    console.error('User is not authenticated.');
    return [];
  }

  try {
    // First check if the user exists
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.error('User document not found');
      return [];
    }

    // Get all users except current user
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    const matches: Match[] = [];

    // Get current user's movies first
    const userMoviesRef = collection(db, 'users', userId, 'movies');
    const userMoviesSnap = await getDocs(userMoviesRef);
    const userMovies = userMoviesSnap.docs;

    // Process each potential match
    for (const targetUserDoc of usersSnap.docs) {
      const targetUserId = targetUserDoc.id;

      // Skip self-matching and invalid users
      if (targetUserId === userId || !targetUserDoc.exists()) {
        continue;
      }

      try {
        // Get target user's movies
        const targetMoviesRef = collection(db, 'users', targetUserId, 'movies');
        const targetMoviesSnap = await getDocs(targetMoviesRef);
        const targetMovies = targetMoviesSnap.docs;

        // Find common movies
        const commonMovies = findCommonMovies(userMovies, targetMovies);

        if (commonMovies.length > 0) {
          const score = calculateScore(commonMovies);
          if (score >= MATCH_THRESHOLD) {
            matches.push({
              userId: targetUserId,
              score,
              commonMovies,
            });
          }
        }
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          console.warn(
            `Skipping match calculation for user ${targetUserId}: Permission denied.`
          );
        } else {
          console.warn(
            `Skipping match calculation for user ${targetUserId}:`,
            error.message
          );
        }
        continue;
      }
    }

    // Sort matches by score in descending order
    return matches.sort((a, b) => b.score - a.score);
  } catch (error: any) {
    console.error('Error in calculateMatchScore:', error);
    return [];
  }
};

export { findCommonMovies, calculateScore };
