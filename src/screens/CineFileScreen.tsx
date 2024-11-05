import React, { useState, useRef } from 'react';
import { 
  View, 
  Text,  // Add this import
  StyleSheet, 
  FlatList, 
  Image, 
  Dimensions, 
  TouchableOpacity, 
  ScrollView, 
  Animated 
} from 'react-native';
import { useMovieLists } from '../context/MovieListContext';
import { PanGestureHandler, State, LongPressGestureHandler } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');
const POSTER_HEIGHT = height / 6; // Base height for posters
const POSTER_WIDTH = POSTER_HEIGHT / 1.5; // Using standard movie poster ratio
const COLLAPSED_COLUMNS = Math.floor((width - 50) / POSTER_WIDTH); // Calculate max columns that fit

const TierRow = ({ tier, color, movies, onMovieDrop }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const expandAnim = new Animated.Value(0);

  const renderMovieItem = ({ item, index }) => (
    <LongPressGestureHandler
      minDurationMs={1000}
      onHandlerStateChange={({ nativeEvent }) => {
        if (nativeEvent.state === State.ACTIVE) {
          // Enable drag mode
        }
      }}
    >
      <TouchableOpacity style={[styles.movieItem, 
        isExpanded ? styles.expandedMovie : { width: POSTER_WIDTH }
      ]}>
        <Image
          source={{ uri: `https://image.tmdb.org/t/p/w500${item.poster_path}` }}
          style={[
            styles.poster,
            isExpanded ? styles.expandedPoster : { width: POSTER_WIDTH, height: POSTER_HEIGHT }
          ]}
        />
        {isExpanded && (
          <Text style={styles.movieTitle} numberOfLines={2}>
            {item.title}
          </Text>
        )}
      </TouchableOpacity>
    </LongPressGestureHandler>
  );

  return (
    <Animated.View style={[styles.tierContainer, {
      height: expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [POSTER_HEIGHT + 10, height / 2]
      })
    }]}>
      <View style={styles.tierRow}>
        {isExpanded ? (
          <FlatList
            data={movies}
            renderItem={renderMovieItem}
            keyExtractor={(item) => `${tier}-expanded-${item.id}`}
            style={styles.expandedList}
            contentContainerStyle={styles.expandedContainer}
          />
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            decelerationRate="fast"
            snapToInterval={POSTER_WIDTH}
            snapToAlignment="start"
          >
            <View style={styles.collapsedRow}>
              {movies.map((movie, index) => (
                <View key={`${tier}-collapsed-${movie.id}-${index}`}>
                  {renderMovieItem({ item: movie, index })}
                </View>
              ))}
            </View>
          </ScrollView>
        )}
        <TouchableOpacity 
          style={[styles.tierLabel, { backgroundColor: color }]}
          onPress={() => {
            setIsExpanded(!isExpanded);
            Animated.spring(expandAnim, {
              toValue: isExpanded ? 0 : 1,
              useNativeDriver: false,
              tension: 50,
              friction: 10
            }).start();
          }}
        >
          <Text style={styles.tierText}>{tier}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const CineFileScreen: React.FC = () => {
  const { movieLists } = useMovieLists();

  const tiers = [
    { tier: 'S', color: '#FF6B6B', movies: movieLists.mostWatch?.slice(0, 10) || [] },
    { tier: 'A', color: '#FFA06B', movies: movieLists.mostWatch?.slice(10, 20) || [] },
    { tier: 'B', color: '#FFD93D', movies: movieLists.seen?.slice(0, 10) || [] },
    { tier: 'C', color: '#6BCB77', movies: movieLists.seen?.slice(10, 20) || [] },
    { tier: 'D', color: '#4D96FF', movies: movieLists.watchLater?.slice(0, 10) || [] },
  ];

  const renderTier = ({ item: tier }) => (
    <TierRow 
      tier={tier.tier}
      color={tier.color}
      movies={tier.movies}
      onMovieDrop={(movieId, newTier) => {
        // Handle movie tier change
      }}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={tiers}
        renderItem={renderTier}
        keyExtractor={(item) => item.tier}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.tiersContainer}
        snapToInterval={POSTER_HEIGHT + 10}
        decelerationRate="fast"
        snapToAlignment="start"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  tiersContainer: {
    paddingBottom: 20, // Add some padding at the bottom
  },
  tierContainer: {
    overflow: 'hidden',
    marginBottom: 10,
  },
  tierRow: {
    flexDirection: 'row',
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
  },
  tierLabel: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  tierContent: {
    flex: 1,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    justifyContent: 'center',
  },
  tierText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  gridContainer: {
    flex: 1,
    padding: 0,
  },
  movieItem: {
    marginHorizontal: 2,
  },
  poster: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  horizontalScroll: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: POSTER_HEIGHT,
    paddingHorizontal: 4,
  },
  dragItem: {
    position: 'absolute',
    zIndex: 999,
  },
  expandedList: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  expandedContainer: {
    padding: 10,
  },
  expandedMovie: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  expandedPoster: {
    width: 60,
    height: 90,
    marginRight: 10,
    borderRadius: 4,
  },
  movieTitle: {
    color: '#fff',
    flex: 1,
    fontSize: 16,
  },
});

export default CineFileScreen;
