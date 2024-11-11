// src/screens/CineGamesScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface GameOption {
  id: string;
  title: string;
  description: string;
}

const CineGamesScreen: React.FC = () => {
  const gameOptions: GameOption[] = [
    {
      id: 'image-quiz',
      title: 'Movie Image Quiz',
      description: 'Guess the movie from image cutouts'
    },
    {
      id: 'trivia',
      title: 'Movie Trivia',
      description: 'Test your movie knowledge'
    },
    {
      id: 'story-guess',
      title: 'Story Guesser',
      description: 'Identify the movie from its plot'
    }
  ];

  const handleGameSelect = (gameId: string) => {
    // TODO: Navigate to specific game screen
    console.log(`Selected game: ${gameId}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>CineGames</Text>
      <ScrollView contentContainerStyle={styles.gamesContainer}>
        {gameOptions.map((game) => (
          <TouchableOpacity
            key={game.id}
            style={styles.gameCard}
            onPress={() => handleGameSelect(game.id)}
          >
            <Text style={styles.gameTitle}>{game.title}</Text>
            <Text style={styles.gameDescription}>{game.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Dark background
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
    color: '#ffffff', // White text
  },
  gamesContainer: {
    padding: 16,
    gap: 16,
  },
  gameCard: {
    backgroundColor: '#1E1E1E', // Dark card background
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: '#333333', // Subtle border
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#ffffff', // White text
  },
  gameDescription: {
    fontSize: 14,
    color: '#B3B3B3', // Light gray text
  },
});

export default CineGamesScreen;
