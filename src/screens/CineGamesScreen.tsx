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
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
    color: '#333',
  },
  gamesContainer: {
    padding: 16,
    gap: 16,
  },
  gameCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  gameDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default CineGamesScreen;
