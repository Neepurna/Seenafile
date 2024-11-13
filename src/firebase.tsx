// src/firebase.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  initializeAuth, 
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  Auth,
  onAuthStateChanged
} from 'firebase/auth';
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

export type ListenerType = 'profile' | 'review';

interface FirebaseListener {
  id: string;
  type: ListenerType;
  unsubscribe: () => void;
  userId?: string;
}

class ListenerManager {
  private static listeners = new Map<string, FirebaseListener>();

  static addListener(listener: FirebaseListener) {
    this.listeners.set(listener.id, listener);
  }

  static removeListener(id: string) {
    const listener = this.listeners.get(id);
    if (listener) {
      try {
        listener.unsubscribe();
        this.listeners.delete(id);
      } catch (e) {
        console.warn(`Error removing listener ${id}:`, e);
      }
    }
  }

  static removeListenersByType(type: ListenerType) {
    this.listeners.forEach((listener, id) => {
      if (listener.type === type) {
        this.removeListener(id);
      }
    });
  }

  static removeListenersByUser(userId: string) {
    this.listeners.forEach((listener, id) => {
      if (listener.userId === userId) {
        this.removeListener(id);
      }
    });
  }

  static removeAllListeners() {
    this.listeners.forEach((_, id) => this.removeListener(id));
  }
}

// Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyD-frQ7fze6ZMh9FWsTjUuGicXAKAHYQW8",
  authDomain: "seenafile.firebaseapp.com",
  projectId: "seenafile",
  storageBucket: "seenafile.firebasestorage.app",
  messagingSenderId: "634839266205",
  appId: "1:634839266205:web:8e74887ab8cbf3b870f574",
  measurementId: "G-7QGRHQBSWX"
};

// Initialize Firebase only once
let app;
let auth: Auth;
let db: Firestore;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app);
  db = getFirestore(app);
} else {
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };

const actionCodeSettings = {
  url: 'https://seenafile.firebaseapp.com/verify-email',
  handleCodeInApp: false
};

// Listener management with cleanup functionality
interface FirebaseListener {
  id: string;
  type: 'profile' | 'reviews' | 'other';
  unsubscribe: () => void;
}

let activeListeners: FirebaseListener[] = [];
let listeners: { [key: string]: () => void } = {};

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

const cleanupAllListeners = () => {
  Object.keys(listeners).forEach(key => {
    try {
      if (listeners[key]) {
        listeners[key]();
        delete listeners[key];
      }
    } catch (e) {
      console.warn('Error cleaning up mapped listener:', e);
    }
  });
  
  while (activeListeners.length > 0) {
    const listener = activeListeners.pop();
    try {
      if (listener) {
        listener.unsubscribe();
      }
    } catch (e) {
      console.warn('Error cleaning up active listener:', e);
    }
  }
};

// Sign-out function with listener cleanup
export const signOut = async () => {
  try {
    // First cleanup all listeners
    ListenerManager.removeAllListeners();
    
    // Then sign out
    await auth.signOut();
    return { error: null };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return { error: error.message };
  }
};

export { ListenerManager };

// Authentication functions
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!userCredential.user.emailVerified) {
      await auth.signOut();
      return { 
        user: userCredential.user,
        error: 'Please verify your email before logging in',
        needsVerification: true 
      };
    }
    return { user: userCredential.user, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { user: null, error: errorMessage };
  }
};

export const signUp = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user, actionCodeSettings);
    await auth.signOut();
    return { 
      user: userCredential.user, 
      error: null,
      message: 'Verification email sent. Please check your inbox.' 
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { user: null, error: errorMessage };
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email.toLowerCase(), actionCodeSettings);
    return { 
      error: null, 
      message: 'If an account exists with this email, a password reset link will be sent.' 
    };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Please enter a valid email address';
    return { error: errorMessage };
  }
};

// Ensure user is authenticated before listener setup
const isAuthenticated = () => auth.currentUser != null;

// Example listener setup with cleanup registration
export const listenToUserData = (userId: string, callback: (data: any) => void) => {
  if (!isAuthenticated()) {
    console.warn('User not authenticated for listener');
    return;
  }

  const userDocRef = doc(db, 'users', userId);
  const unsubscribe = onSnapshot(
    userDocRef,
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        callback(docSnapshot.data());
      } else {
        console.warn('No user data found');
      }
    },
    (error) => {
      console.error('Listener error:', error);
    }
  );

  listeners[`userData_${userId}`] = unsubscribe;
};

// Authentication state observer to manage listeners on auth change
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cleanupAllListeners();
  }
});
