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

export const calculateMatchScore = async (currentUserId: string, otherUserId: string) => {
  try {
    const currentUserMovies = await getDocs(collection(db, 'users', currentUserId, 'movies'));
    const otherUserMovies = await getDocs(collection(db, 'users', otherUserId, 'movies'));

    if (currentUserMovies.empty || otherUserMovies.empty) {
      return { score: 0, commonMovies: [] };
    }

    // Convert to arrays with proper movie data
    const currentUserMovieList = currentUserMovies.docs.map(doc => ({
      movieId: doc.data().movieId,
      title: doc.data().title,
      category: doc.data().category,
      status: doc.data().status || 'watched'
    }));

    const otherUserMovieList = otherUserMovies.docs.map(doc => ({
      movieId: doc.data().movieId,
      title: doc.data().title,
      category: doc.data().category,
      status: doc.data().status || 'watched'
    }));

    // Find common movies based on movieId (not document id)
    const commonMovies = currentUserMovieList.filter(currentMovie =>
      otherUserMovieList.some(otherMovie => otherMovie.movieId === currentMovie.movieId)
    );

    // Calculate weighted score
    let score = 0;
    if (commonMovies.length > 0) {
      // Base score: percentage of common movies relative to the smaller collection
      const minMoviesCount = Math.min(currentUserMovieList.length, otherUserMovieList.length);
      score = (commonMovies.length / minMoviesCount) * 100;
      
      // Add bonus for having more common movies
      if (commonMovies.length > 10) score += 10;
      if (commonMovies.length > 20) score += 10;
      
      // Cap the score at 100
      score = Math.min(Math.round(score), 100);
    }

    return {
      score,
      commonMovies
    };
  } catch (error) {
    console.error('Error in calculateMatchScore:', error);
    throw error;
  }
};

export { findCommonMovies, calculateScore };
