// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  Auth,
  getReactNativePersistence
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getFirestore,
  Firestore,
  setDoc, 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  addDoc,
  orderBy,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';

// Add at the top after imports
interface FirebaseListener {
  id: string;
  type: 'chat' | 'profile' | 'reviews' | 'other';
  unsubscribe: () => void;
}

// Single declaration of activeListeners
let activeListeners: FirebaseListener[] = [];

// Consolidated listener management functions
export const addListener = (listener: FirebaseListener) => {
  activeListeners.push(listener);
};

export const removeListener = (id: string) => {
  const index = activeListeners.findIndex(l => l.id === id);
  if (index !== -1) {
    try {
      activeListeners[index].unsubscribe();
      activeListeners.splice(index, 1);
    } catch (e) {
      console.warn('Error removing listener:', e);
    }
  }
};

let listeners: { [key: string]: () => void } = {};

const firebaseConfig = {
  apiKey: "AIzaSyD-frQ7fze6ZMh9FWsTjUuGicXAKAHYQW8",
  authDomain: "seenafile.firebaseapp.com",
  projectId: "seenafile",
  storageBucket: "seenafile.appspot.com", // Make sure this is correct
  messagingSenderId: "634839266205",
  appId: "1:634839266205:web:8e74887ab8cbf3b870f574",
  measurementId: "G-7QGRHQBSWX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Remove the cloudinary v2 import and configuration
// Replace with direct API call implementation

export const verifyEmail = async (userCredential: any) => {
  try {
    await sendEmailVerification(userCredential.user);
    return {
      user: userCredential.user,
      error: null,
      message: 'Verification email sent. Please check your inbox.'
    };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

export const resetPassword = async (email: string) => {
  try {
    // Send reset email directly through Firebase Auth
    await sendPasswordResetEmail(auth, email.toLowerCase(), actionCodeSettings);
    return { 
      error: null, 
      message: 'If an account exists with this email, a password reset link will be sent.' 
    };
  } catch (error: any) {
    // Only show specific error for invalid email format
    if (error.code === 'auth/invalid-email') {
      return { error: 'Please enter a valid email address.' };
    }
    
    // For security, don't reveal if email exists or not
    return { 
      error: null,
      message: 'If an account exists with this email, a password reset link will be sent.'
    };
  }
};

export const resendVerificationEmail = async (user) => {
  try {
    await sendEmailVerification(user);
    return { error: null, message: 'Verification email resent!' };
  } catch (error) {
    return { error: error.message };
  }
};

export const createUserWithProfile = async (userData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      userData.email, 
      userData.password
    );

    // Send verification email first
    await sendEmailVerification(userCredential.user);

    // Create user profile in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      name: userData.name,
      dob: userData.dob,
      gender: userData.gender || 'not_specified',
      email: userData.email,
      createdAt: new Date(),
      moviesWatched: 0,
      matches: 0,
      watchlist: 0,
    });

    await auth.signOut();

    return { 
      error: null,
      message: 'Account created! Please check your email to verify your account.'
    };
  } catch (error: any) {
    console.error('Account creation error:', error);
    return { error: error.message };
  }
};

export const getUserProfile = async (userId) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
    
    if (!userSnap.exists()) {
      console.error('No user profile found');
      return null;
    }
    
    return userSnap.data();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error; // Propagate error to component
  }
};

export const initializeUserProfile = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        stats: {
          moviesWatched: 0,
          matches: 0,
          achievements: 0
        },
        createdAt: new Date()
      });
    }
    return true;
  } catch (error) {
    console.error('Error initializing user profile:', error);
    return false;
  }
};

export const updateUserStats = async (userId: string, category: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const currentStats = userDoc.data()?.stats || { 
      moviesWatched: 0, 
      matches: 0, 
      achievements: 0 
    };

    const updatedStats = {
      ...currentStats,
      moviesWatched: category === 'watched' ? currentStats.moviesWatched + 1 : currentStats.moviesWatched,
      matches: category === 'most_watch' ? currentStats.matches + 1 : currentStats.matches,
      achievements: category === 'watch_later' ? currentStats.achievements + 1 : currentStats.achievements,
    };

    await updateDoc(userRef, { stats: updatedStats });
    return updatedStats;
  } catch (error) {
    console.error('Error updating user stats:', error);
    return null;
  }
};

export const getUserMovies = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const moviesCollection = collection(userRef, 'movies');
    const moviesSnapshot = await getDocs(moviesCollection);
    
    const movies = moviesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return movies;
  } catch (error) {
    console.error('Error fetching user movies:', error);
    return [];
  }
};

// Add these validation helpers to match firestore.rules
const isValidUserData = (userData: any) => {
  return userData.email && userData.name;
};

const isValidMovieInteraction = (data: any) => {
  return data.status && 
         data.movieId && 
         typeof data.status === 'string' &&
         typeof data.movieId === 'string';
};

export const saveMovie = async (userId: string, movie: any, category: string) => {
  // Verify user is owner
  if (auth.currentUser?.uid !== userId) {
    throw new Error('Unauthorized access');
  }

  try {
    const movieRef = doc(db, 'users', userId, 'movies', movie.id.toString());
    const movieData = {
      movieId: movie.id.toString(),
      title: movie.title,
      poster_path: movie.poster_path,
      category,
      status: category, // Add status to match rules
      timestamp: new Date()
    };

    // Validate data matches rules
    if (!isValidMovieInteraction(movieData)) {
      throw new Error('Invalid movie data');
    }

    await setDoc(movieRef, movieData, { merge: true });
    await updateUserStats(userId, category);
    return true;
  } catch (error) {
    console.error('Error saving movie:', error);
    throw error;
  }
};

// Add this validation helper
const isValidReview = (reviewData: any) => {
  return (
    reviewData.movieId &&
    reviewData.movieTitle &&
    reviewData.rating > 0 &&
    reviewData.rating <= 5 &&
    reviewData.review?.trim().length > 0
  );
};

export const saveReview = async (reviewData: {
  movieId: number;
  movieTitle: string;
  backdrop: string | null;
  rating: number;
  review: string;
  isPublic: boolean;
  userId: string;
}) => {
  try {
    // Check authentication
    if (!auth.currentUser) {
      throw new Error('User must be authenticated');
    }

    // Validate review data
    if (!isValidReview(reviewData)) {
      throw new Error('Please provide both rating and review');
    }

    // Get user data for username
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const username = userDoc.data()?.name || 'Anonymous';

    // Create review document
    const newReview = {
      ...reviewData,
      username,
      userId: auth.currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: 0
    };

    // Save private review
    const userReviewRef = doc(db, 'users', auth.currentUser.uid, 'reviews', `movie_${reviewData.movieId}`);
    await setDoc(userReviewRef, newReview);

    // If public, save to shared collection
    if (reviewData.isPublic) {
      const sharedReviewsRef = collection(db, 'sharedReviews');
      await addDoc(sharedReviewsRef, newReview);
    }

    return { id: userReviewRef.id, error: null };
  } catch (error: any) {
    console.error('Error saving review:', error);
    return { error: error.message };
  }
};

// Global listener management
const listenerMap = new Map<string, Unsubscribe>();

// Replace the getSharedReviews function
export const getSharedReviews = (callback: (reviews: any[]) => void) => {
  // Generate a unique ID for this listener
  const listenerId = `sharedReviews_${Date.now()}`;

  try {
    const reviewsRef = collection(db, 'sharedReviews');
    const q = query(reviewsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reviews = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(reviews);
      },
      (error) => {
        console.log('Listener error:', error);
        callback([]);
        // Clean up this listener if there's an error
        if (listeners[listenerId]) {
          listeners[listenerId]();
          delete listeners[listenerId];
        }
      }
    );

    // Store the unsubscribe function
    listeners[listenerId] = unsubscribe;

    // Return cleanup function
    return () => {
      if (listeners[listenerId]) {
        listeners[listenerId]();
        delete listeners[listenerId];
      }
    };
  } catch (error) {
    console.error('Error setting up shared reviews listener:', error);
    return () => {};
  }
};

// Update getUserReviews to access 'users/{userId}/reviews'
export const getUserReviews = async (userId: string) => {
  try {
    const reviewsRef = collection(db, 'users', userId, 'reviews');
    const q = query(
      reviewsRef, 
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    return [];
  }
};

// Ensure the user is authenticated before accessing data
auth.onAuthStateChanged(user => {
  if (user) {
    // User is signed in, safe to access protected resources
    // ...existing code...
  } else {
    // No user is signed in, handle accordingly
  }
});

// Add these new functions after existing code
export const createMatch = async (matchData: {
  userId: string;
  targetId: string;
  score: number;
  commonMovies: any[];
}) => {
  try {
    const matchesRef = collection(db, 'matches');
    await addDoc(matchesRef, {
      ...matchData,
      timestamp: new Date(),
      status: 'active'
    });
    return true;
  } catch (error) {
    console.error('Error creating match:', error);
    return false;
  }
};

// Add interfaces
interface Match {
  id?: string;
  userId: string;
  targetId?: string;
  score: number;
  commonMovies: Array<{
    movieId: string;
    category: string;
  }>;
  timestamp?: Date;
  status?: string;
}

// Make sure to export the function
export const getUserMatches = async (userId: string): Promise<Match[]> => {
  try {
    if (!userId) {
      console.error('No userId provided to getUserMatches');
      return [];
    }

    console.log('Fetching matches for user:', userId);

    const matchesRef = collection(db, 'matches');
    const userMatchesQuery = query(matchesRef, where('userId', '==', userId));
    const receivedMatchesQuery = query(matchesRef, where('targetId', '==', userId));

    const [userMatchesSnap, receivedMatchesSnap] = await Promise.all([
      getDocs(userMatchesQuery),
      getDocs(receivedMatchesQuery)
    ]);

    const allMatches = [
      ...userMatchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      ...receivedMatchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    ] as Match[];

    console.log('Found matches:', allMatches.length);
    return allMatches;
  } catch (error) {
    console.error('Error in getUserMatches:', error);
    return [];
  }
};

// ...existing code...

// ...existing imports...

interface FirebaseListener {
  id: string;
  type: string;
  unsubscribe: () => void;
  userId?: string;
}

// Remove the first ListenerManagerClass and combine it with the second implementation
export class ListenerManager {
  private static listeners: Map<string, () => void> = new Map();
  private static userListeners: Map<string, string[]> = new Map();

  static addListener(id: string, unsubscribe: () => void, userId?: string) {
    this.listeners.set(id, unsubscribe);
    if (userId) {
      const userListeners = this.userListeners.get(userId) || [];
      userListeners.push(id);
      this.userListeners.set(userId, userListeners);
    }
  }

  static removeListener(id: string) {
    const unsubscribe = this.listeners.get(id);
    if (unsubscribe) {
      try {
        unsubscribe();
        this.listeners.delete(id);
      } catch (e) {
        console.warn('Error removing listener:', e);
      }
    }
  }

  static removeUserListeners(userId: string) {
    const userListeners = this.userListeners.get(userId) || [];
    userListeners.forEach(id => this.removeListener(id));
    this.userListeners.delete(userId);
  }

  static removeAllListeners() {
    this.listeners.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (e) {
        console.warn('Error cleaning up listener:', e);
      }
    });
    this.listeners.clear();
    this.userListeners.clear();
  }
}

// Update signOut function to use the new implementation
export const signOut = async () => {
  try {
    // Clean up all listeners
    ListenerManager.removeAllListeners();
    
    // Clean up legacy listeners
    Object.keys(listeners).forEach(key => {
      try {
        if (listeners[key]) {
          listeners[key]();
          delete listeners[key];
        }
      } catch (e) {
        console.warn('Error cleaning up legacy listener:', e);
      }
    });
    
    // Clear the legacy listeners object
    listeners = {};
    
    // Sign out from Firebase
    await auth.signOut();
    return { error: null };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return { error: error.message };
  }
};

// Remove or comment out subscribeToMatches and related functions that we're not using

// Add this helper function
export const getUserName = async (userId: string): Promise<string> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.data()?.name || 'Movie Enthusiast';
  } catch (error) {
    console.error('Error getting username:', error);
    return 'Movie Enthusiast';
  }
};

// Add the new function to save reviews
export const saveReviewToUserCollection = async (userId: string, reviewData: {
  movieId: string;
  movieTitle: string;
  review: string;
  rating: number;
  poster_path?: string;
  backdrop?: string;
}) => {
  if (!auth.currentUser) throw new Error('No authenticated user');

  try {
    const userRef = doc(db, 'users', userId);
    const reviewsRef = collection(userRef, 'reviews');
    
    const newReview = {
      ...reviewData,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: auth.currentUser.uid
    };

    await addDoc(reviewsRef, newReview);
    return true;
  } catch (error) {
    console.error('Error saving review:', error);
    throw error;
  }
};

// ...existing code...

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    if (!userCredential.user) {
      return { user: null, error: 'Login failed', needsVerification: false };
    }

    if (!userCredential.user.emailVerified) {
      return { 
        user: userCredential.user, 
        error: null, 
        needsVerification: true 
      };
    }

    return { 
      user: userCredential.user, 
      error: null, 
      needsVerification: false 
    };
  } catch (error: any) {
    console.error('Sign in error:', error);
    let errorMessage = 'An error occurred during sign in';
    
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled';
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        errorMessage = 'Invalid email or password';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many attempts. Please try again later';
        break;
    }
    
    return { user: null, error: errorMessage, needsVerification: false };
  }
};

// ...existing code...
