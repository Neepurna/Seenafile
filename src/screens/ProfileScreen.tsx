// src/screens/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { auth, getUserProfile } from '../firebase';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!auth.currentUser) {
        navigation.navigate('Login');
        return;
      }

      try {
        setIsLoading(true);
        const profile = await getUserProfile(auth.currentUser.uid);
        if (!profile) {
          // If profile doesn't exist, create a default one
          setUserProfile({
            name: auth.currentUser.displayName || 'New User',
            email: auth.currentUser.email,
            moviesWatched: 0,
            matches: 0,
            watchlist: 0,
          });
        } else {
          setUserProfile(profile);
        }
      } catch (err) {
        setError('Failed to load profile');
        Alert.alert('Error', 'Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, []);

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
              await auth.signOut();
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
            <Icon name="edit" size={18} color="#000" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{userProfile?.name || 'Loading...'}</Text>
        <Text style={styles.userHandle}>{userProfile?.email}</Text>
      </View>

      <View style={styles.dashboard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>150</Text>
          <Text style={styles.statLabel}>Movies</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>45</Text>
          <Text style={styles.statLabel}>Matches</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>24</Text>
          <Text style={styles.statLabel}>Watchlist</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Icon name="logout" size={24} color="#FFF" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 50,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 20,
    padding: 3,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
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
    fontSize: 26,
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
