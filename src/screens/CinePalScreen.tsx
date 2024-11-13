import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { auth } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@connected_users';

const CinePalScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        // Load persisted data...
      } catch (error) {
        console.error('Error loading persisted data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPersistedData();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#BB86FC" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#BB86FC" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
});

export default CinePalScreen;
