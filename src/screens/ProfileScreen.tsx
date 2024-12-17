// src/screens/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, FlatList, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { auth, db, signOut } from '../firebase';
import { doc, getDoc, collection, query, onSnapshot } from 'firebase/firestore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width } = Dimensions.get('window');
const FOLDER_SIZE = width / 2 - 30;

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

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [folderCounts, setFolderCounts] = useState<{ [key: string]: number }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Add error state

  useEffect(() => {
    if (!auth.currentUser) {
      navigation.navigate('Login');
      return;
    }

    const userId = auth.currentUser.uid;
    const userRef = doc(db, 'users', userId);
    const moviesRef = collection(userRef, 'movies');

    // Fetch user profile
    const profileUnsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data());
      }
      setIsLoading(false);
    });

    // Fetch movie counts
    const moviesUnsubscribe = onSnapshot(moviesRef, (snapshot) => {
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
    });

    return () => {
      profileUnsubscribe();
      moviesUnsubscribe();
    };
  }, [navigation]);

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          onPress: async () => {
            try {
              await signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

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
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={{ color: '#FFF' }}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.profileImageContainer}>
          <Image
            source={{ uri: 'https://placeholder.com/150' }}
            style={styles.profileImage}
          />
          <TouchableOpacity style={styles.editButton}>
            <MaterialIcons name="edit" size={18} color="#000" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{userProfile?.name || 'Loading...'}</Text>
        <Text style={styles.userHandle}>{userProfile?.email}</Text>
      </View>

      <FlatList
        data={folders}
        renderItem={renderFolder}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
      />

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <MaterialIcons name="logout" size={24} color="#FFF" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 40,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
    padding: 2,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 20,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  userHandle: {
    fontSize: 16,
    color: '#888',
  },
  dashboard: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    marginHorizontal: 30,
    backgroundColor: '#111',
    borderRadius: 15,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  separator: {
    width: 1,
    height: 40,
    backgroundColor: '#333',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 40,
    marginHorizontal: 30,
    padding: 16,
    backgroundColor: '#222',
    borderRadius: 12,
  },
  signOutText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFF',
    fontSize: 16,
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
});

export default ProfileScreen;
