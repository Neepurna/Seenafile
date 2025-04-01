import React from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface CastListProps {
  cast: CastMember[];
  isLoading: boolean;
}

const CastList: React.FC<CastListProps> = ({ cast, isLoading }) => {
  if (isLoading) {
    return <ActivityIndicator size="small" color="#FFD700" />;
  }

  if (!cast.length) {
    return <Text style={styles.noDataText}>No cast information available</Text>;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.castScroll}
        contentContainerStyle={styles.castContainer}
        scrollEventThrottle={16}
        directionalLockEnabled={true}
        pointerEvents="box-none"
        pagingEnabled={false}
        bounces={true}
        alwaysBounceHorizontal={true}
      >
        {cast.map(member => (
          <View 
            key={member.id} 
            style={styles.castCard}
            pointerEvents="none"
          >
            <Image 
              source={{
                uri: member.profile_path 
                  ? `https://image.tmdb.org/t/p/w185${member.profile_path}`
                  : 'https://via.placeholder.com/185x278?text=No+Image'
              }}
              style={styles.castImage}
            />
            <Text style={styles.castName} numberOfLines={1}>{member.name}</Text>
            <Text style={styles.castCharacter} numberOfLines={1}>{member.character}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  castScroll: {
    flexGrow: 0,
    width: '100%',
  },
  castContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  castCard: {
    width: 80,
    marginRight: 15,
    alignItems: 'center',
  },
  castImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 5,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  castName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 80,
  },
  castCharacter: {
    color: '#999',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
    width: 80,
  },
  noDataText: {
    color: '#999',
    fontStyle: 'italic',
  },
});

export default CastList;
