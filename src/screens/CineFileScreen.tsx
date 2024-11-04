import React from 'react';
import { View, StyleSheet, Text, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = [
  { id: 'watched', title: 'Watched', icon: 'checkmark-circle', color: '#4CAF50' },
  { id: 'favourite', title: 'Favourite', icon: 'heart', color: '#FF4D6D' },
  { id: 'critic', title: 'Critic', icon: 'star', color: '#FFB23F' },
  { id: 'watchLater', title: 'Watch Later', icon: 'time', color: '#7B8CDE' },
  { id: 'notSure', title: 'Not Sure', icon: 'help-circle', color: '#45B8AC' },
  { id: 'tierList', title: 'Tier List', icon: 'trophy', color: '#9C27B0' },
];

const TIER_LEVELS = [
  { tier: 'S', color: '#FF4D6D' },
  { tier: 'A', color: '#4CAF50' },
  { tier: 'B', color: '#FFB23F' },
  { tier: 'C', color: '#7B8CDE' },
  { tier: 'D', color: '#45B8AC' },
  { tier: 'F', color: '#9C27B0' },
];

const FloatingActionButton = ({ onPress }) => (
  <TouchableOpacity style={styles.fab} onPress={onPress}>
    <Ionicons name="add" size={24} color="#FFFFFF" />
  </TouchableOpacity>
);

const TierListSection = ({ movies = [] }) => (
  <View style={styles.tierListContainer}>
    {TIER_LEVELS.map((level) => (
      <View key={level.tier} style={styles.tierRow}>
        <View style={[styles.tierLabel, { backgroundColor: level.color }]}>
          <Text style={styles.tierText}>{level.tier}</Text>
        </View>
        <View style={[styles.tierContent, { borderColor: level.color }]}>
          {movies.filter(movie => movie.tier === level.tier).length === 0 ? (
            <Text style={styles.emptyText}>Drag movies here</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.tierMovies}>
                {movies
                  .filter(movie => movie.tier === level.tier)
                  .map(movie => (
                    <View key={movie.id} style={styles.movieThumbnail}>
                      <View style={[styles.thumbnailPlaceholder, { backgroundColor: level.color }]} />
                      <Text numberOfLines={1} style={styles.thumbnailTitle}>{movie.title}</Text>
                    </View>
                  ))}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    ))}
  </View>
);

const CineFileScreen = () => {
  const handleCustomList = () => {
    // Handle custom list creation
    console.log('Create custom list');
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {CATEGORIES.map((category) => (
          <MovieSection key={category.id} category={category} />
        ))}
      </ScrollView>
      <FloatingActionButton onPress={handleCustomList} />
    </View>
  );
};

const MovieSection = ({ category, movies = [] }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Ionicons name={category.icon} size={24} color={category.color} />
      <Text style={styles.sectionTitle}>{category.title}</Text>
    </View>
    {category.id === 'tierList' ? (
      <TierListSection movies={movies} />
    ) : movies.length === 0 ? (
      <View style={styles.emptySection}>
        <Text style={styles.emptyText}>No movies added yet</Text>
      </View>
    ) : (
      <FlatList
        horizontal
        data={movies}
        renderItem={({ item }) => (
          <View style={styles.movieCard}>
            <View style={styles.moviePoster}>
              {/* Poster placeholder */}
              <View style={[styles.posterPlaceholder, { backgroundColor: category.color }]} />
            </View>
            <Text style={styles.movieTitle}>{item.title}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id?.toString()}
        contentContainerStyle={styles.movieList}
        showsHorizontalScrollIndicator={false}
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
  },
  movieList: {
    paddingHorizontal: 12,
  },
  movieCard: {
    width: 140,
    marginHorizontal: 4,
  },
  moviePoster: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  posterPlaceholder: {
    flex: 1,
    opacity: 0.7,
  },
  movieTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptySection: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#333333',
  },
  emptyText: {
    color: '#666666',
    fontSize: 14,
  },
  wrapper: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#FF4D6D',
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  tierListContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  tierRow: {
    flexDirection: 'row',
    marginBottom: 8,
    height: 80,
    alignItems: 'center',
  },
  tierLabel: {
    width: 50,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  tierContent: {
    flex: 1,
    height: '100%',
    backgroundColor: '#121212',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 2,
    borderLeftWidth: 0,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  tierText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  tierMovies: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  movieThumbnail: {
    width: 50,
    marginRight: 8,
  },
  thumbnailPlaceholder: {
    height: 50,
    borderRadius: 4,
    opacity: 0.7,
  },
  thumbnailTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
});

export default CineFileScreen;
