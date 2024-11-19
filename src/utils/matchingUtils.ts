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

  // Base score calculation
  // Assuming 50 movies is a perfect match (100%)
  const maxMovies = 50;
  const basePercentage = Math.min((commonMovies.length / maxMovies) * 100, 70);

  // Calculate status bonus (max 30%)
  const statusBonus = commonMovies.reduce((bonus, movie) => {
    if (movie.status === 'mostwatch') {
      return bonus + 0.6; // 0.6% per mostwatch movie
    }
    if (movie.status === 'watched') {
      return bonus + 0.4; // 0.4% per watched movie
    }
    if (movie.status === 'watchlater') {
      return bonus + 0.2; // 0.2% per watchlater movie
    }
    return bonus;
  }, 0);

  // Combine scores and ensure it's between 0-100
  const totalScore = Math.min(basePercentage + statusBonus, 100);

  // Round to nearest integer
  return Math.round(totalScore);
};

export const calculateMatchScore = async (userId: string): Promise<Match[]> => {
  if (!userId) {
    console.error('No userId provided');
    return [];
  }

  try {
    // Get current user's movies
    const userMoviesRef = collection(db, 'users', userId, 'movies');
    const userMoviesSnap = await getDocs(userMoviesRef);
    const userMovies = userMoviesSnap.docs;

    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    const matches: Match[] = [];

    // Process each potential match
    for (const targetUserDoc of usersSnap.docs) {
      if (targetUserDoc.id === userId) continue; // Skip self

      try {
        const targetUserData = targetUserDoc.data();
        const targetMoviesRef = collection(db, 'users', targetUserDoc.id, 'movies');
        const targetMoviesSnap = await getDocs(targetMoviesRef);
        
        const commonMovies = findCommonMovies(userMovies, targetMoviesSnap.docs);
        const score = calculateScore(commonMovies);

        if (score >= 20) { // Only include matches with 20% or higher
          matches.push({
            userId: targetUserDoc.id,
            username: targetUserData.name || 'Movie Enthusiast',
            score,
            commonMovies
          });
        }
      } catch (error) {
        console.warn(`Skipping user ${targetUserDoc.id}:`, error);
        continue;
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Error in calculateMatchScore:', error);
    return [];
  }
};

export { findCommonMovies, calculateScore };
