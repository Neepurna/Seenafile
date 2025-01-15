// src/screens/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, FlatList, Dimensions, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { auth, db, signOut } from '../firebase';
import { doc, getDoc, collection, query, onSnapshot, getDocs } from 'firebase/firestore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width, height } = Dimensions.get('window');
const FOLDER_SIZE = width / 2 - 24; // Adjusted for better spacing

interface FolderData {
  id: string;
  name: string;
  color: string;
  count: number;
  icon: string;
}

// Update the folders array with correct icon
const folders: FolderData[] = [
  { id: 'watched', name: 'Watched', color: '#4BFF4B', count: 0, icon: 'checkmark-circle' },
  { id: 'most_watch', name: 'Most Watched', color: '#FFD700', count: 0, icon: 'repeat' },
  { id: 'watch_later', name: 'Watch Later', color: '#00BFFF', count: 0, icon: 'time' },
  { id: 'critics', name: 'Critics', color: '#FF4081', count: 0, icon: 'star' }, // Changed icon to 'star'
];

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [folderCounts, setFolderCounts] = useState<{ [key: string]: number }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Add error state
  const [userReviews, setUserReviews] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) {
      navigation.navigate('Login');
      return;
    }

    const userId = auth.currentUser.uid;
    const userRef = doc(db, 'users', userId);
    const moviesRef = collection(userRef, 'movies');
    const reviewsRef = collection(userRef, 'reviews');

    // Fetch user profile
    const profileUnsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data());
      }
      setIsLoading(false);
    });

    // Replace fetchData with live snapshot listener
    const moviesUnsubscribe = onSnapshot(moviesRef, (snapshot) => {
      try {
        const counts = {
          watched: 0,
          most_watch: 0,
          watch_later: 0,
          critics: 0
        };

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.category) {
            if (data.category === 'most_watched') {
              counts.most_watch++;
            } else if (counts.hasOwnProperty(data.category)) {
              counts[data.category]++;
            }
          }
        });

        setFolderCounts(counts);
        setIsLoading(false);
      } catch (error) {
        console.error('Error processing movies:', error);
        setError('Failed to load data');
        setIsLoading(false);
      }
    });

    // Fetch reviews if needed for critics folder
    const reviewsUnsubscribe = onSnapshot(reviewsRef, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUserReviews(reviewsData);
    });

    return () => {
      profileUnsubscribe();
      moviesUnsubscribe();
      reviewsUnsubscribe();
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

  // Update the folder press handler in renderFolder
  const renderFolder = ({ item: folder }: { item: FolderData }) => (
    <TouchableOpacity 
      style={[
        styles.folderContainer, 
        { 
          borderColor: folder.color,
          // Special styling for critics folder
          ...(folder.id === 'critics' && {
            backgroundColor: 'rgba(255,64,129,0.1)',
          })
        }
      ]}
      onPress={() => navigation.navigate('MovieGridScreen', { 
        folderId: folder.id === 'most_watch' ? 'most_watch' : folder.id, // Ensure consistent ID
        folderName: folder.name,
        folderColor: folder.color,
        isCritics: folder.id === 'critics' // Add this flag for MovieGridScreen
      })}
    >
      <Ionicons 
        name={folder.icon as any} 
        size={folder.id === 'critics' ? 45 : 40} 
        color={folder.color} 
      />
      <Text style={styles.folderName}>{folder.name}</Text>
      <Text style={[styles.folderCount, { color: folder.color }]}>
        {folderCounts[folder.id] || 0} {folder.id === 'critics' ? 'reviews' : 'movies'}
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
    <SafeAreaView style={styles.container}>
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
        <Text style={styles.userBio}>
          {userProfile?.bio || "No bio yet. Add something about yourself! 🎬"}
        </Text>
      </View>

      <View style={styles.contentContainer}>
        <FlatList
          data={folders}
          renderItem={renderFolder}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <MaterialIcons name="logout" size={24} color="#FFF" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.05,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: height * 0.015,
    padding: 2,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileImage: {
    width: width * 0.25,
    height: width * 0.25,
    borderRadius: width * 0.125,
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
    fontSize: width * 0.055,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: height * 0.008,
  },
  userHandle: {
    fontSize: width * 0.04,
    color: '#888',
    marginBottom: height * 0.01,
  },
  userBio: {
    fontSize: width * 0.038,
    color: '#FFF',
    textAlign: 'center',
    paddingHorizontal: width * 0.1,
    marginBottom: height * 0.02,
  },
  contentContainer: {
    flex: 1,
    marginTop: height * 0.02,
  },
  gridContainer: {
    padding: 12,
  },
  folderContainer: {
    width: FOLDER_SIZE,
    height: FOLDER_SIZE,
    margin: 6,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  folderName: {
    color: '#FFF',
    fontSize: width * 0.04,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  folderCount: {
    fontSize: width * 0.035,
    marginTop: 5,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: width * 0.08,
    marginBottom: height * 0.03,
    padding: height * 0.02,
    backgroundColor: '#222',
    borderRadius: 12,
  },
  signOutText: {
    marginLeft: 10,
    fontSize: width * 0.04,
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
});

export default ProfileScreen;
