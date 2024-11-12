import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { auth, db } from '../firebase';
import { doc, collection, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { calculateMatchScore } from '../utils/matchingUtils';

const TestMatchingScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  // Test data
  const testUsers = [
    {
      id: 'testUser1',
      name: 'Test User 1',
      movies: [
        { 
          movieId: '1', 
          title: 'Movie 1', 
          category: 'watched',
          status: 'watched',
          poster_path: '/default.jpg',
          timestamp: new Date() 
        },
        { 
          movieId: '2', 
          title: 'Movie 2', 
          category: 'most_watch',
          status: 'most_watch',
          poster_path: '/default.jpg',
          timestamp: new Date() 
        },
        // Add 48 more movies to meet the 50 movie threshold
      ]
    },
    {
      id: 'testUser2',
      name: 'Test User 2',
      movies: [
        { 
          movieId: '1', 
          title: 'Movie 1', 
          category: 'watched',
          status: 'watched',
          poster_path: '/default.jpg',
          timestamp: new Date() 
        },
        { 
          movieId: '2', 
          title: 'Movie 2', 
          category: 'most_watch',
          status: 'most_watch',
          poster_path: '/default.jpg',
          timestamp: new Date() 
        },
        // Add 48 more movies with some overlapping
      ]
    },
  ];

  const addLog = (message: string) => {
    setResults(prev => [...prev, message]);
  };

  const setupTestData = async () => {
    if (!auth.currentUser) {
      addLog('Error: No user logged in');
      return;
    }

    setLoading(true);
    try {
      // Create test users sequentially
      for (const user of testUsers) {
        addLog(`Setting up ${user.name}...`);
        
        // Create or update user document
        const userRef = doc(db, 'users', user.id);
        await setDoc(userRef, {
          displayName: user.name,
          email: `${user.id}@test.com`,
          testUser: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }, { merge: true });

        // Add movies in batches
        const moviesCollection = collection(userRef, 'movies');
        for (const movie of user.movies) {
          const movieRef = doc(moviesCollection, movie.movieId);
          await setDoc(movieRef, {
            movieId: movie.movieId,
            title: movie.title,
            category: movie.category,
            status: movie.status,
            poster_path: movie.poster_path,
            timestamp: new Date(),
            testData: true
          });
          addLog(`Added movie: ${movie.title}`);
        }
      }

      addLog('Test data setup complete');
    } catch (error: any) {
      addLog(`Error setting up test data: ${error.message}`);
      console.error('Setup error details:', error);
    } finally {
      setLoading(false);
    }
  };

  const runMatchingTest = async () => {
    if (!auth.currentUser) {
      addLog('Error: No user logged in');
      return;
    }

    setLoading(true);
    try {
      // Test matching algorithm
      const matches = await calculateMatchScore(auth.currentUser.uid);
      
      addLog('Matching Results:');
      matches.forEach(match => {
        addLog(`Match with ${match.userId}: ${match.score.toFixed(2)}% compatibility`);
        addLog(`Common movies: ${match.commonMovies.length}`);
      });
    } catch (error) {
      addLog(`Error running matching test: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const clearTestData = async () => {
    setLoading(true);
    try {
      for (const user of testUsers) {
        addLog(`Cleaning up ${user.name}...`);
        
        const userRef = doc(db, 'users', user.id);
        const moviesRef = collection(userRef, 'movies');
        
        // Delete movies first
        const moviesSnapshot = await getDocs(moviesRef);
        if (!moviesSnapshot.empty) {
          const deletePromises = moviesSnapshot.docs.map(async (movieDoc) => {
            try {
              await deleteDoc(movieDoc.ref);
              addLog(`Deleted movie: ${movieDoc.data().title}`);
            } catch (error) {
              addLog(`Failed to delete movie: ${movieDoc.id}`);
              console.error('Movie deletion error:', error);
            }
          });
          
          await Promise.all(deletePromises);
        }
        
        // Delete user document
        try {
          await deleteDoc(userRef);
          addLog(`Deleted user: ${user.name}`);
        } catch (error) {
          addLog(`Failed to delete user: ${user.name}`);
          console.error('User deletion error:', error);
        }
      }

      addLog('Test data cleanup complete');
    } catch (error: any) {
      addLog(`Error during cleanup: ${error.message}`);
      console.error('Cleanup error details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={setupTestData}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Setup Test Data</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={runMatchingTest}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Run Matching Test</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={clearTestData}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Clear Test Data</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <ActivityIndicator size="large" color="#BB86FC" />
      )}

      <ScrollView style={styles.logContainer}>
        {results.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#BB86FC',
    padding: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    padding: 10,
    borderRadius: 8,
  },
  logText: {
    color: '#E1E1E1',
    marginBottom: 4,
  },
});

export default TestMatchingScreen;