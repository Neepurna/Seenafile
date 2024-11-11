// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { 
  initializeAuth, 
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getFirestore, 
  setDoc, 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  addDoc
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD-frQ7fze6ZMh9FWsTjUuGicXAKAHYQW8",
  authDomain: "seenafile.firebaseapp.com",
  projectId: "seenafile",
  storageBucket: "seenafile.firebasestorage.app",
  messagingSenderId: "634839266205",
  appId: "1:634839266205:web:8e74887ab8cbf3b870f574",
  measurementId: "G-7QGRHQBSWX"
};

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);

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

// Add new review functions
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
    if (!auth.currentUser) {
      throw new Error('User must be authenticated');
    }

    const reviewsRef = collection(db, 'reviews');
    const newReview = {
      ...reviewData,
      createdAt: new Date(),
      userId: auth.currentUser.uid,
    };

    const docRef = await addDoc(reviewsRef, newReview);
    return { id: docRef.id, error: null };
  } catch (error: any) {
    console.error('Error saving review:', error);
    return { error: error.message };
  }
};

export const getUserReviews = async (userId: string) => {
  try {
    const reviewsRef = collection(db, 'reviews');
    const q = query(reviewsRef, where('userId', '==', userId));
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
