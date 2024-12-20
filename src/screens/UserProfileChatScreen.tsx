import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList, Dimensions } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { db } from '../firebase';
import { collection, query, getDocs, doc, getDoc, where } from 'firebase/firestore';
import ChatList from '../components/ChatList';
import { UserProfileChatScreenProps } from '../types/navigation';

const { width } = Dimensions.get('window');
const FOLDER_SIZE = width / 2 - 24;

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
  { id: 'critics', name: 'Critics', color: '#FF4081', count: 0, icon: 'star' },
];

const UserProfileChatScreen: React.FC<UserProfileChatScreenProps> = ({ route, navigation }) => {
  const { userId, username, chatId } = route.params;
  const [userProfile, setUserProfile] = useState<any>(null);
  const [folderCounts, setFolderCounts] = useState<{ [key: string]: number }>({});
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
    fetchMovieCounts();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchMovieCounts = async () => {
    try {
      const userRef = doc(db, 'users', userId);
      const moviesRef = collection(userRef, 'movies');
      const snapshot = await getDocs(moviesRef);
      
      const counts = {
        watched: 0,
        most_watch: 0,
        watch_later: 0,
        critics: 0
      };

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const category = data.category;
        if (category && counts.hasOwnProperty(category)) {
          counts[category]++;
        }
      });

      setFolderCounts(counts);
    } catch (error) {
      console.error('Error fetching movie counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFolder = ({ item: folder }: { item: FolderData }) => {
    const count = folderCounts[folder.id] || 0;
    const isDisabled = count === 0;
  
    return (
      <TouchableOpacity 
        style={[
          styles.folderContainer,
          { 
            borderColor: isDisabled ? '#666' : folder.color,
            backgroundColor: isDisabled 
              ? 'rgba(102,102,102,0.1)'
              : folder.id === 'critics'
                ? 'rgba(255,64,129,0.1)'
                : 'rgba(255,255,255,0.05)',
            opacity: isDisabled ? 0.5 : 1
          }
        ]}
        onPress={() => {
          if (!isDisabled) {
            navigation.navigate('MovieGridScreen', { 
              folderId: folder.id,
              folderName: folder.name,
              folderColor: folder.color,
              userId: userId,
              isCritics: folder.id === 'critics'
            });
          }
        }}
        disabled={isDisabled}
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
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {userProfile?.photoURL ? (
              <Image source={{ uri: userProfile.photoURL }} style={styles.profileImage} />
            ) : (
              <MaterialIcons name="person" size={60} color="#BB86FC" />
            )}
          </View>
          <Text style={styles.userName}>{username}</Text>
          <Text style={styles.userHandle}>{userProfile?.email}</Text>
          <Text style={styles.userBio}>
            {userProfile?.bio || "This user hasn't added a bio yet 🎬"}
          </Text>
        </View>

        {/* Folders Grid */}
        <View style={styles.contentContainer}>
          <FlatList
            data={folders}
            renderItem={renderFolder}
            keyExtractor={item => item.id}
            numColumns={2}
            contentContainerStyle={styles.gridContainer}
            scrollEnabled={false}
          />
        </View>

        {/* Chat Toggle */}
        <TouchableOpacity 
          style={styles.chatButton}
          onPress={() => setShowChat(!showChat)}
        >
          <MaterialIcons 
            name={showChat ? "chat-bubble" : "chat-bubble-outline"} 
            size={24} 
            color="#000" 
          />
          <Text style={styles.chatButtonText}>
            {showChat ? 'Hide Chat' : 'Show Chat'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {showChat && (
        <View style={styles.chatSection}>
          <ChatList 
            matches={[{ userId, username }]}
            selectedMatch={{ userId, username }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // ... copy styles from ProfileScreen and add/modify as needed ...
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  profileImageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  userHandle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8,
  },
  userBio: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  contentContainer: {
    flex: 1,
    padding: 12,
  },
  gridContainer: {
    padding: 6,
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
  },
  folderName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  folderCount: {
    fontSize: 14,
    marginTop: 5,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#BB86FC',
    padding: 16,
    margin: 20,
    borderRadius: 8,
  },
  chatButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  chatSection: {
    flex: 1,
    maxHeight: 400,
    borderTopWidth: 1,
    borderTopColor: '#333',
  }
});

export default UserProfileChatScreen;
