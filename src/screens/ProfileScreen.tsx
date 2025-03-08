// src/screens/ProfileScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Alert,
  FlatList,
  Dimensions,
  SafeAreaView,
  Animated,
  ScrollView,
  Platform,
  ImageBackground,
  ActivityIndicator,
  StatusBar // Add this import
} from 'react-native';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { auth, db, signOut, storage } from '../firebase';
import { doc, getDoc, collection, query, onSnapshot, getDocs, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width, height } = Dimensions.get('window');
const COVER_HEIGHT = height * 0.25; // Reduced cover height
const PROFILE_IMAGE_SIZE = 100; // Slightly smaller profile image
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
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState({
    totalMovies: 0,
    reviewsGiven: 0,
    matchesCount: 0,
    level: 1
  });
  const [isUpdating, setIsUpdating] = useState(false);

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

  // Replace handleImagePick with this new implementation
  const handleImageSelect = async (type: 'profile' | 'cover') => {
    try {
      const options = {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: type === 'cover' ? 1200 : 500,
        maxHeight: type === 'cover' ? 800 : 500,
      };

      const result = await launchImageLibrary(options);

      if (result.didCancel || !result.assets?.[0].uri) return;

      setIsUpdating(true);
      const imageUri = result.assets[0].uri;
      const userId = auth.currentUser?.uid;

      if (!userId) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      // Create storage reference
      const imageName = `${type}_${userId}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `users/${userId}/${imageName}`);

      // Upload file
      const fetchResponse = await fetch(imageUri);
      const blob = await fetchResponse.blob();
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Update user profile
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        [type === 'profile' ? 'photoURL' : 'coverURL']: downloadURL,
      });

      // Update local state
      if (type === 'profile') {
        setUserProfile(prev => ({ ...prev, photoURL: downloadURL }));
      } else {
        setCoverPhoto(downloadURL);
      }

    } catch (error) {
      console.error('Error updating image:', error);
      Alert.alert('Error', 'Failed to update image');
    } finally {
      setIsUpdating(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.coverContainer}>
        <Image
          source={
            userProfile?.coverURL
              ? { uri: userProfile.coverURL }
              : require('../../assets/default-cover.jpg')
          }
          style={styles.coverImage}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']}
          style={StyleSheet.absoluteFill}
        />
        <TouchableOpacity 
          style={styles.changeCoverButton}
          onPress={() => handleImageSelect('cover')}
        >
          <MaterialIcons name="photo-camera" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.profileImageSection}>
        <TouchableOpacity 
          style={styles.profileImageContainer}
          onPress={() => handleImageSelect('profile')}
        >
          <Image
            source={
              userProfile?.photoURL
                ? { uri: userProfile.photoURL }
                : require('../../assets/default-avatar.png')
            }
            style={styles.profileImage}
          />
          <View style={styles.profileImageOverlay}>
            <MaterialIcons name="photo-camera" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {renderHeader()}
      
      <View style={styles.contentContainer}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userProfile?.name || 'Loading...'}</Text>
          <Text style={styles.userEmail}>{userProfile?.email}</Text>
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          {Object.entries(folderCounts).map(([key, count]) => (
            <TouchableOpacity 
              key={key}
              style={styles.statCard}
              onPress={() => navigation.navigate('MovieGridScreen', {
                folderId: key,
                folderName: folders.find(f => f.id === key)?.name,
                folderColor: folders.find(f => f.id === key)?.color
              })}
            >
              <LinearGradient
                colors={['rgba(187,134,252,0.2)', 'rgba(187,134,252,0.1)']}
                style={styles.statGradient}
              >
                <Text style={styles.statCount}>{count}</Text>
                <Text style={styles.statLabel}>
                  {key.replace('_', ' ')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={handleSignOut}
        >
          <MaterialIcons name="logout" size={24} color="#FFF" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {isUpdating && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#BB86FC" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  headerContainer: {
    height: COVER_HEIGHT + (PROFILE_IMAGE_SIZE / 2),
    zIndex: 1,
  },
  coverContainer: {
    height: COVER_HEIGHT,
    width: '100%',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeCoverButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },
  profileImageSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  profileImageContainer: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    borderWidth: 4,
    borderColor: '#121212',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  userInfo: {
    alignItems: 'center',
    marginTop: 8,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  editProfileButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(187,134,252,0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BB86FC',
  },
  editProfileText: {
    color: '#BB86FC',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 8,
  },
  statCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#BB86FC',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    textTransform: 'capitalize',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginTop: 'auto',
    marginBottom: 16,
  },
  signOutText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  // ... keep existing loading and error styles ...
});

export default ProfileScreen;
