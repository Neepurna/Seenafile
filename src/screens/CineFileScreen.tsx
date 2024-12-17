import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const FOLDER_SIZE = width / 2 - 30; // 2 columns with padding
const GRID_SIZE = width / 4 - 20; // 4 columns for movies grid

interface FolderData {
  id: string;
  name: string;
  color: string;
  count: number;
  icon: string;
}

const folders: FolderData[] = [
  { id: 'watched', name: 'Watched', color: '#4BFF4B', count: 0, icon: 'checkmark-circle' },
  { id: 'most_watch', name: 'Most Watched', color: '#FFD700', count: 0, icon: 'repeat' },
  { id: 'watch_later', name: 'Watch Later', color: '#00BFFF', count: 0, icon: 'time' },
  { id: 'custom', name: 'Custom List', color: '#9C27B0', count: 0, icon: 'list' },
];

type NavigationProp = StackNavigationProp<RootStackParamList>;

const CineFileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [folderCounts, setFolderCounts] = useState<{ [key: string]: number }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Set up real-time listener for movie counts
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const moviesRef = collection(userRef, 'movies');

    const unsubscribe = onSnapshot(moviesRef, (snapshot) => {
      const counts: { [key: string]: number } = {
        watched: 0,
        most_watch: 0,
        watch_later: 0,
        custom: 0
      };

      snapshot.docs.forEach(doc => {
        const category = doc.data().category;
        if (category in counts) {
          counts[category]++;
        }
      });

      setFolderCounts(counts);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderFolder = ({ item: folder }: { item: FolderData }) => (
    <TouchableOpacity 
      style={[styles.folderContainer, { borderColor: folder.color }]}
      onPress={() => navigation.navigate('MovieGridScreen', { 
        folderId: folder.id,
        folderName: folder.name,
        folderColor: folder.color
      })}
    >
      <Ionicons name={folder.icon as any} size={40} color={folder.color} />
      <Text style={styles.folderName}>{folder.name}</Text>
      <Text style={[styles.folderCount, { color: folder.color }]}>
        {folderCounts[folder.id] || 0} movies
      </Text>
      {isLoading && (
        <ActivityIndicator 
          size="small" 
          color={folder.color} 
          style={styles.loader}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={folders}
        renderItem={renderFolder}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  gridContainer: {
    padding: 15,
  },
  folderContainer: {
    width: FOLDER_SIZE,
    height: FOLDER_SIZE,
    margin: 7.5,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  folderCount: {
    fontSize: 14,
    marginTop: 5,
  },
  loader: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
});

export default CineFileScreen;
