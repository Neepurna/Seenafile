// src/screens/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';  // Changed from react-native-vector-icons
import { auth, db, signOut } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Add type definition for routes
type RootStackParamList = {
  Login: undefined;
  Profile: undefined;
  // Add other screen names here
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ProfileScreenProps {
  onClose: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onClose }) => {
  const navigation = useNavigation<NavigationProp>();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    const loadUserProfile = async () => {
      if (!auth.currentUser) {
        navigation.navigate('Login' as never);
        return;
      }

      try {
        if (!isSubscribed) return;
        setIsLoading(true);
        setError(null);
        
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          const defaultProfile = {
            name: auth.currentUser.displayName || 'New User',
            email: auth.currentUser.email,
            createdAt: new Date()  // Changed from serverTimestamp()
          };
          
          await setDoc(userRef, defaultProfile);
          if (isSubscribed) setUserProfile(defaultProfile);
        } else {
          if (isSubscribed) setUserProfile(userDoc.data());
        }
      } catch (err) {
        console.error('Profile loading error:', err);
        if (isSubscribed) {
          setError('Failed to load profile');
          Alert.alert('Error', 'Failed to load profile data');
        }
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    };

    loadUserProfile();

    // Cleanup function
    return () => {
      isSubscribed = false;
      setUserProfile(null);
      setError(null);
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
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

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
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={onClose}
      >
        <MaterialIcons name="close" size={24} color="#FFF" />
      </TouchableOpacity>

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

      <View style={styles.dashboard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {userProfile?.joinDate ? new Date(userProfile.joinDate).getFullYear() : new Date().getFullYear()}
          </Text>
          <Text style={styles.statLabel}>Member Since</Text>
        </View>
      </View>

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
});

export default ProfileScreen;
