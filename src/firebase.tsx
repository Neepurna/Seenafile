// src/firebase.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  initializeAuth, 
  getAuth,
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
let listeners: { [key: string]: () => void } = {};

const firebaseConfig = {
  apiKey: "AIzaSyD-frQ7fze6ZMh9FWsTjUuGicXAKAHYQW8",
  authDomain: "seenafile.firebaseapp.com",
  projectId: "seenafile",
  storageBucket: "seenafile.firebasestorage.app",
  messagingSenderId: "634839266205",
  appId: "1:634839266205:web:8e74887ab8cbf3b870f574",
  measurementId: "G-7QGRHQBSWX"
};

// Initialize Firebase with proper typing
let app;
let auth: Auth;
let db: Firestore;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  db = getFirestore(app);
} else {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };

const actionCodeSettings = {
  url: 'https://seenafile.firebaseapp.com/verify-email',  // Change this to your verified domain
  handleCodeInApp: false // Change to false since we're using redirect URL
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!userCredential.user.emailVerified) {
      await auth.signOut(); // Sign out unverified user
      return { 
        user: userCredential.user,
        error: 'Please verify your email before logging in',
        needsVerification: true 
      };
    }
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const signUp = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user, actionCodeSettings);
    await auth.signOut(); // Sign out after registration
    return { 
      user: userCredential.user, 
      error: null,
      message: 'Verification email sent. Please check your inbox.' 
    };
  } catch (error) {
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

// Add a collection of active listeners
let activeListeners: (() => void)[] = [];

// Add function to register listeners
export const registerListener = (unsubscribe: () => void) => {
  activeListeners.push(unsubscribe);
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

export const getUserReviews = async (userId: string) => {
  try {
    const reviewsRef = collection(db, 'reviews');
    const q = query(
      reviewsRef, 
      where('userId', '==', userId),
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

// Update signOut function to ensure all listeners are cleaned up
export const signOut = async () => {
  try {
    // Clean up all listeners first
    Object.keys(listeners).forEach(key => {
      try {
        if (listeners[key]) {
          listeners[key]();
          delete listeners[key];
        }
      } catch (e) {
        console.warn('Error cleaning up listener:', e);
      }
    });
    
    // Clear the listeners object
    listeners = {};
    
    // Sign out
    await auth.signOut();
    return { error: null };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return { error: error.message };
  }
};

// ...existing code...
