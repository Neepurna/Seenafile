// src/screens/CineFileScreen.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import MovieReview from '../components/MovieReview'; // Adjust the import path as necessary

const CineFileScreen: React.FC = () => {
  const sampleMovie = {
    title: 'Inception',
    // Include other movie properties if needed
  };

  return (
    <View style={styles.container}>
      <MovieReview movie={sampleMovie} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5', // Optional: set a background color
  },
});

export default CineFileScreen;
