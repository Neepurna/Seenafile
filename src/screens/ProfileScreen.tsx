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
  StatusBar, // Add this import
  TextInput
} from 'react-native';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { auth, db, signOut } from '../firebase';
import { doc, getDoc, collection, query, onSnapshot, getDocs, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadToCloudinary } from '../services/cloudinary';

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

interface MovieThumbnail {
  id: string;
  poster_path: string;
  movieTitle?: string; // Add this field
}

// Update the folders array with correct icon
const folders: FolderData[] = [
  { id: 'watched', name: 'Watched', color: '#4BFF4B', count: 0, icon: 'checkmark-circle' },
  { id: 'most_watch', name: 'Most Watched', color: '#FFD700', count: 0, icon: 'repeat' },
  { id: 'watch_later', name: 'Watch Later', color: '#00BFFF', count: 0, icon: 'time' },
  { id: 'critics', name: 'Critics', color: '#FF4081', count: 0, icon: 'star' }, // Changed icon to 'star'
];

// Update the type definitions
type RootStackParamList = {
  MovieGridScreen: {
    folderId: string;
    folderName: string;
    folderColor: string;
    isCritics: boolean;
    userId: string;
    fromScreen: string;
  };
  Login: undefined;
  // ... other routes
};

type NavigationType = NavigationProp<RootStackParamList>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationType>();
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
  const [folderThumbnails, setFolderThumbnails] = useState<{ [key: string]: MovieThumbnail[] }>({});
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bio, setBio] = useState('');
  const [tempBio, setTempBio] = useState('');

  useEffect(() => {
    if (!auth.currentUser) {
      navigation.navigate('Login');
      return;
    }

    const userId = auth.currentUser.uid;
    const userRef = doc(db, 'users', userId);
    
    // Fetch initial user profile data
    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
          setBio(userDoc.data().bio || '');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setError('Unable to load profile data. Please check your connection and try again.');
        setIsLoading(false);
      }
    };
    
    fetchUserProfile();

    const handleError = (error: any) => {
      console.error('Snapshot error:', error);
      if (error.code === 'permission-denied') {
        setError('Access denied. Please sign out and sign in again.');
      } else {
        setError('Unable to load data. Please check your connection.');
      }
      setIsLoading(false);
    };

    // Wrap listeners in try-catch
    try {
      const moviesRef = collection(userRef, 'movies');
      const reviewsRef = collection(userRef, 'reviews');

      const reviewsUnsubscribe = onSnapshot(reviewsRef, 
        (snapshot) => {
          const reviewsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setUserReviews(reviewsData);

          // Update critics folder count and thumbnails
          const criticsCount = reviewsData.length;
          setFolderCounts(prev => ({ ...prev, critics: criticsCount }));

          // Update critics thumbnails
          setFolderThumbnails(prev => ({
            ...prev,
            critics: reviewsData
              .filter(review => review.poster_path)
              .slice(0, 2)
              .map(review => ({
                id: review.id,
                poster_path: review.poster_path,
                movieTitle: review.movieTitle
              }))
          }));
        }, 
        handleError
      );

      const MOVIES_CACHE_KEY = `user_movies_${userId}`;
      const moviesUnsubscribe = onSnapshot(moviesRef, 
        async (snapshot) => {
          try {
            const counts = {
              watched: 0,
              most_watch: 0,
              watch_later: 0,
              critics: folderCounts.critics || 0
            };
            
            const thumbsByFolder = { ...folderThumbnails };
            const moviesByFolder: { [key: string]: any[] } = {};

            snapshot.docs.forEach(doc => {
              const data = doc.data();
              if (data.category) {
                const category = data.category === 'most_watched' ? 'most_watch' : data.category;
                if (counts.hasOwnProperty(category) && category !== 'critics') {
                  counts[category]++;
                  
                  // Store full movie data by folder
                  if (!moviesByFolder[category]) {
                    moviesByFolder[category] = [];
                  }
                  moviesByFolder[category].push({
                    id: doc.id,
                    ...data
                  });

                  // Update thumbnails
                  if (!thumbsByFolder[category]) {
                    thumbsByFolder[category] = [];
                  }
                  if (thumbsByFolder[category].length < 2 && data.poster_path) {
                    thumbsByFolder[category].push({
                      id: doc.id,
                      poster_path: data.poster_path,
                      movieTitle: data.movieTitle || data.title
                    });
                  }
                }
              }
            });

            // Cache the full movie data
            await AsyncStorage.setItem(MOVIES_CACHE_KEY, JSON.stringify(moviesByFolder));

            setFolderCounts(prev => ({ ...prev, ...counts }));
            setFolderThumbnails(thumbsByFolder);
            setIsLoading(false);
          } catch (error) {
            console.error('Error processing movies:', error);
            
            // Try to load from cache if live update fails
            try {
              const cachedData = await AsyncStorage.getItem(MOVIES_CACHE_KEY);
              if (cachedData) {
                const moviesByFolder = JSON.parse(cachedData);
                // Update counts and thumbnails from cache
                const counts = Object.keys(moviesByFolder).reduce((acc, category) => ({
                  ...acc,
                  [category]: moviesByFolder[category].length
                }), {});
                
                setFolderCounts(prev => ({ ...prev, ...counts }));
                // Update thumbnails from cached data
                const thumbsByFolder = Object.keys(moviesByFolder).reduce((acc, category) => ({
                  ...acc,
                  [category]: moviesByFolder[category]
                    .filter(movie => movie.poster_path)
                    .slice(0, 2)
                    .map(movie => ({
                      id: movie.id,
                      poster_path: movie.poster_path,
                      movieTitle: movie.movieTitle || movie.title
                    }))
                }), {});
                setFolderThumbnails(thumbsByFolder);
              }
            } catch (cacheError) {
              console.error('Error loading cached movies:', cacheError);
            }
            
            setError('Failed to load data');
            setIsLoading(false);
          }
        },
        handleError
      );

      return () => {
        reviewsUnsubscribe();
        moviesUnsubscribe();
      };
    } catch (error) {
      handleError(error);
      return () => {};
    }
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

  const handleImageSelect = async (type: 'profile' | 'cover') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow access to your photo library to change your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'profile' ? [1, 1] : [16, 9],
        quality: 0.7,
      });

      if (result.canceled) {
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        Alert.alert('Error', 'No image selected');
        return;
      }

      const asset = result.assets[0];
      setIsUpdating(true);
      const userId = auth.currentUser?.uid;

      if (!userId) {
        Alert.alert('Error', 'Please log in again');
        setIsUpdating(false);
        return;
      }

      try {
        // Upload to Cloudinary
        const cloudinaryUrl = await uploadToCloudinary(
          asset.uri,
          `users/${userId}/${type}_images`
        );

        // Update Firestore user profile
        const userRef = doc(db, 'users', userId);
        const updateData = {
          [type === 'profile' ? 'photoURL' : 'coverURL']: cloudinaryUrl,
        };
        await updateDoc(userRef, updateData);

        // Update local state - FIXED VERSION
        if (type === 'profile') {
          setUserProfile(prev => ({ ...prev, photoURL: cloudinaryUrl }));
        } else {
          setUserProfile(prev => ({ ...prev, coverURL: cloudinaryUrl }));
          setCoverPhoto(cloudinaryUrl);
        }

        Alert.alert('Success', 'Image updated successfully');
      } catch (error) {
        console.error('Upload error:', error);
        Alert.alert('Error', 'Failed to upload image. Please try again.');
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to open image picker');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveBio = async () => {
    if (!auth.currentUser) return;

    try {
      setIsUpdating(true);
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        bio: tempBio.trim(),
        updatedAt: new Date()
      });
      setBio(tempBio.trim());
      setIsEditingBio(false);
      Alert.alert('Success', 'Bio updated successfully');
    } catch (error) {
      console.error('Error updating bio:', error);
      Alert.alert('Error', 'Failed to update bio');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNavigateToMovieGrid = (params: {
    folderId: string;
    folderName: string;
    folderColor: string;
    isCritics: boolean;
  }) => {
    // Use MovieGridScreen directly instead of ProfileMovieGrid
    navigation.navigate('MovieGridScreen', {
      folderId: params.folderId,
      folderName: params.folderName,
      folderColor: params.folderColor,
      isCritics: params.isCritics,
      userId: auth.currentUser?.uid || '',
      fromScreen: 'Profile'
    });
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <TouchableOpacity 
        style={styles.coverContainer}
        onPress={() => handleImageSelect('cover')}
        activeOpacity={0.7}
      >
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
      </TouchableOpacity>

      <View style={styles.profileImageSection}>
        <TouchableOpacity 
          style={styles.profileImageContainer}
          onPress={() => handleImageSelect('profile')}
          activeOpacity={0.7}
        >
          <Image
            source={
              userProfile?.photoURL
                ? { uri: userProfile.photoURL }
                : require('../../assets/default-avatar.png')
            }
            style={styles.profileImage}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderUserInfo = () => (
    <View style={styles.userInfo}>
      <Text style={styles.userEmail}>{userProfile?.email}</Text>
      {isEditingBio ? (
        <View style={styles.bioEditContainer}>
          <TextInput
            style={styles.bioInput}
            value={tempBio}
            onChangeText={setTempBio}
            placeholder="Write something about yourself..."
            placeholderTextColor="#666"
            multiline
            maxLength={150}
          />
          <View style={styles.bioButtonsContainer}>
            <TouchableOpacity 
              style={[styles.bioButton, styles.cancelButton]}
              onPress={() => {
                setTempBio(bio);
                setIsEditingBio(false);
              }}
            >
              <Text style={styles.bioButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.bioButton, styles.saveButton]}
              onPress={handleSaveBio}
            >
              <Text style={styles.bioButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.bioContainer}
          onPress={() => {
            setTempBio(bio);
            setIsEditingBio(true);
          }}
        >
          <Text style={styles.bioText}>
            {bio || 'Tap to add bio'}
          </Text>
          <MaterialIcons name="edit" size={20} color="#BB86FC" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      {folders.map((folder) => {
        const count = folderCounts[folder.id] || 0;
        const thumbs = folderThumbnails[folder.id] || [];
        
        return (
          <TouchableOpacity
            key={folder.id}
            style={styles.statCard}
            onPress={() => handleNavigateToMovieGrid({
              folderId: folder.id,
              folderName: folder.name,
              folderColor: folder.color,
              isCritics: folder.id === 'critics'
            })}
          >
            <LinearGradient
              colors={['rgba(187,134,252,0.2)', 'rgba(187,134,252,0.1)']}
              style={styles.statGradient}
            >
              <View style={styles.folderHeader}>
                <View style={styles.folderIconContainer}>
                  <Ionicons name={folder.icon as any} size={24} color="#fff" />
                </View>
                <View style={styles.folderInfo}>
                  <Text style={styles.folderName}>{folder.name}</Text>
                  <Text style={styles.folderCount}>
                    {count} {folder.id === 'critics' ? 'reviews' : 'movies'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.thumbnailsRow}>
                {thumbs.map((thumb, index) => (
                  <View key={thumb.id} style={styles.thumbnailWrapper}>
                    <Image
                      source={{ uri: `https://image.tmdb.org/t/p/w92${thumb.poster_path}` }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  </View>
                ))}
                {count > 2 && (
                  <View style={styles.moreIndicator}>
                    <Text style={styles.moreIndicatorText}>+{count - 2}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleSignOut}
        >
          <Text style={styles.retryButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {renderHeader()}
      
      <View style={styles.contentContainer}>
        {renderUserInfo()}
        {renderStats()}
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
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    // Add shadow for better visibility
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  userInfo: {
    alignItems: 'center',
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
  bioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(187,134,252,0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(187,134,252,0.2)',
    minWidth: '80%',
  },
  bioText: {
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  bioEditContainer: {
    width: '80%',
    marginTop: 8,
  },
  bioInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bioButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  bioButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  saveButton: {
    backgroundColor: 'rgba(187,134,252,0.2)',
    borderWidth: 1,
    borderColor: '#BB86FC',
  },
  bioButtonText: {
    color: '#fff',
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
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  folderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(51, 51, 51, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  folderCount: {
    fontSize: 14,
    color: '#888',
  },
  thumbnailsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
  },
  thumbnailWrapper: {
    width: 45,
    height: 68,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  moreIndicator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moreIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginTop: 'auto',
    marginBottom: '30%', // Adjusted to move button up
  },
  signOutText: {
    color: '#fff', // Changed from default black to white
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#BB86FC',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  // ... keep existing loading and error styles ...
});

export default ProfileScreen;
