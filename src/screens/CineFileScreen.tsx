import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  Dimensions, 
  TouchableOpacity, 
  ScrollView, 
  PanResponder, 
  Animated 
} from 'react-native';
import { useMovieLists } from '../context/MovieListContext';

const { width, height } = Dimensions.get('window');
const POSTER_HEIGHT = height / 6; // Base height for posters
const POSTER_WIDTH = POSTER_HEIGHT / 1.5; // Using standard movie poster ratio

const TierRow = ({ tier, color, movies, style, onMoveDrop }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedMovie, setDraggedMovie] = useState(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
    scale.setValue(1);
  }, [isDragging]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value
        });
      },
      onPanResponderMove: Animated.event(
        [
          null,
          { dx: pan.x, dy: pan.y }
        ],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, gesture) => {
        pan.flattenOffset();
        const dropPoint = { x: gesture.moveX, y: gesture.moveY };
        onMoveDrop(draggedMovie, dropPoint);
        setIsDragging(false);
        setDraggedMovie(null);
        pan.setValue({ x: 0, y: 0 });
        scale.setValue(1);
      }
    })
  ).current;

  const renderMovie = (movie, index) => {
    const isBeingDragged = isDragging && draggedMovie?.id === movie.id;
    
    return (
      <View key={`${tier}-${movie.id}-${index}`} style={styles.movieItem}>
        <TouchableOpacity
          onLongPress={() => {
            setDraggedMovie(movie);
            setIsDragging(true);
            Animated.spring(scale, {
              toValue: 1.1,
              useNativeDriver: true,
            }).start();
          }}
          {...(isBeingDragged ? panResponder.panHandlers : {})}
        >
          <Image
            source={{ uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` }}
            style={[styles.poster, { width: POSTER_WIDTH, height: POSTER_HEIGHT }]}
          />
          {isBeingDragged && (
            <Animated.View
              style={[
                styles.draggedPoster,
                {
                  width: POSTER_WIDTH,
                  height: POSTER_HEIGHT,
                  transform: [
                    { translateX: pan.x },
                    { translateY: pan.y },
                    { scale: scale }
                  ]
                }
              ]}
            >
              <Image
                source={{ uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` }}
                style={[styles.poster, { width: POSTER_WIDTH, height: POSTER_HEIGHT }]}
              />
            </Animated.View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.tierContainer, style]}>
      <View style={styles.tierRow}>
        <TouchableOpacity style={[styles.tierLabel, { backgroundColor: color }]}>
          <View style={styles.textWrapper}>
            <Text style={styles.tierText}>{tier}</Text>
          </View>
        </TouchableOpacity>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
        >
          <View style={styles.collapsedRow}>
            {movies.map(renderMovie)}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const CineFileScreen: React.FC = () => {
  const { movieLists, moveMovie } = useMovieLists();
  const [dropZones, setDropZones] = useState({});

  const handleMoveDrop = (movie, dropPoint) => {
    // Find which list the movie was dropped on
    Object.entries(dropZones).forEach(([listId, zone]) => {
      // Prevent dropping if the drop point is below all valid zones
      const mostWatchedZone = dropZones['MOST WATCHED'];
      if (mostWatchedZone && dropPoint.y > mostWatchedZone.y + mostWatchedZone.height) {
        return;
      }
      
      if (isPointInZone(dropPoint, zone)) {
        moveMovie(movie, listId);
      }
    });
  };

  const measureDropZone = (listId) => (event) => {
    event.target.measure((x, y, width, height, pageX, pageY) => {
      setDropZones(prev => ({
        ...prev,
        [listId]: { x: pageX, y: pageY, width, height }
      }));
    });
  };

  const allTiers = [
    // Empty tier at the very top
    { tier: '', color: 'transparent', movies: [], type: 'empty' },
    // Custom list below empty tier
    { tier: 'CUSTOM LIST', color: '#9C27B0', movies: movieLists.custom || [], type: 'custom' },
    // Watch Later and other lists
    { tier: 'WATCH LATER', color: '#4D96FF', movies: movieLists.watchLater || [], type: 'movie' },
    { tier: 'WATCHED', color: '#FFA06B', movies: movieLists.seen || [], type: 'movie' },
    { tier: 'MOST WATCHED', color: '#FF6B6B', movies: movieLists.mostWatch || [], type: 'movie' },
  ];

  const renderItem = ({ item: tier }) => {
    if (tier.type === 'bottom') return <View style={styles.bottomSpacer} />;
    
    return (
      <View onLayout={measureDropZone(tier.tier)}>
        <TierRow 
          key={tier.tier || Math.random()}
          tier={tier.tier}
          color={tier.color}
          movies={tier.movies}
          onMoveDrop={handleMoveDrop}
          style={[
            tier.type === 'empty' ? styles.emptyTierRow : styles.movieTierRow,
            tier.type === 'custom' && styles.customTierRow
          ]}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={allTiers}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.tier || `empty-${index}`}
        contentContainerStyle={[styles.listContent]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  tierContainer: {
    marginHorizontal: 10,
    marginBottom: 15,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    height: POSTER_HEIGHT,
  },
  tierRow: {
    flexDirection: 'row-reverse',
    height: '100%',
  },
  tierLabel: {
    width: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  textWrapper: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
    transform: [{ rotate: '-90deg' }],
    width: POSTER_HEIGHT,
    textAlign: 'center',
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
  movieItem: {
    marginHorizontal: 2,
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  emptyTierRow: {
    opacity: 0.3,
  },
  movieTierRow: {
    opacity: 1,
  },
  bottomSpacer: {
    height: POSTER_HEIGHT * 2,
  },
  listContent: {
    paddingTop: height * 0.15,
    paddingBottom: 20, // Reduced bottom padding
  },
  customTierRow: {
    opacity: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(156,39,176,0.1)', // Matching the purple color
  },
  draggingMovie: {
    opacity: 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  draggedPoster: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default CineFileScreen;
