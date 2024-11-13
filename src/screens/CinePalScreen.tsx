// src/screens/CinePalScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Linking, ActivityIndicator, RefreshControl, Dimensions, Platform, ToastAndroid, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons'; // Replace the icon import
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, getDocs, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { fetchRSSFeeds } from '../services/rssFeedService';
import type { RSSItem } from '../types/rss';
import { calculateMatchScore } from '../utils/matchingUtils';
import { auth } from '../firebase';
import ChatList from '../components/ChatList';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const ReelCard: React.FC<{data: any}> = ({ data }) => (
  <View style={styles.cardContainer}>
    <View style={styles.reelPreview}>
      <MaterialIcons name="play-circle" size={40} color="#FFF" />
    </View>
    <View style={styles.cardFooter}>
      <Text style={styles.username}>{data.username}</Text>
      <Text style={styles.caption}>{data.caption}</Text>
    </View>
  </View>
);

const ImageCard: React.FC<{data: any}> = ({ data }) => (
  <View style={styles.cardContainer}>
    <Image source={{ uri: data.imageUrl }} style={styles.image} />
    <View style={styles.cardFooter}>
      <Text style={styles.username}>{data.username}</Text>
      <Text style={styles.caption}>{data.caption}</Text>
    </View>
  </View>
);

const ReviewCard: React.FC<{data: any}> = ({ data }) => (
  <View style={styles.cardContainer}>
    <View style={styles.reviewHeader}>
      <Text style={styles.movieTitle}>{data.movieTitle}</Text>
      <View style={styles.rating}>
        <MaterialIcons name="star" size={20} color="#FFD700" />
        <Text style={styles.ratingText}>{data.rating}/5</Text>
      </View>
    </View>
    <Text style={styles.reviewText}>{data.review}</Text>
  </View>
);

const NewsCard: React.FC<{data: RSSItem}> = ({ data }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    if (data.imageUrl) {
      console.log('Attempting to load image:', data.imageUrl);
      Image.prefetch(data.imageUrl)
        .then(() => {
          console.log('Image prefetch successful:', data.imageUrl);
          setImageLoading(false);
        })
        .catch((error) => {
          console.error('Image prefetch failed:', data.imageUrl, error);
          setImageError(true);
          setImageLoading(false);
        });
    } else {
      setImageError(true);
      setImageLoading(false);
    }
  }, [data.imageUrl]);

  const handlePress = async () => {
    if (data.link) {
      try {
        const url = data.link.trim();
        const supported = await Linking.canOpenURL(url);
        
        if (supported) {
          await Linking.openURL(url);
        } else {
          console.log("Don't know how to open URL:", url);
        }
      } catch (error) {
        console.error('Error opening URL:', error);
      }
    }
  };

  const getSourceDisplay = (source: string) => {
    switch(source) {
      case 'movies':
        return 'Movie News';
      default:
        return source;
    }
  };

  return (
    <View style={styles.fullCardContainer}>
      <TouchableOpacity 
        style={[styles.cardContainer, styles.newsCardContainer]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.cardInnerContainer}>
          {data.imageUrl && !imageError ? (
            <View style={styles.newsImageWrapper}>
              <Image 
                source={{ uri: data.imageUrl }}
                style={styles.newsImage}
                resizeMode="cover"
                onLoad={() => {
                  console.log('Image loaded successfully:', data.imageUrl);
                  setImageLoading(false);
                }}
                onError={(error) => {
                  console.error('Image loading error:', error.nativeEvent.error);
                  setImageError(true);
                  setImageLoading(false);
                }}
              />
              {imageLoading && (
                <View style={styles.imageLoadingOverlay}>
                  <ActivityIndicator size="large" color="#BB86FC" />
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.newsImageWrapper, styles.placeholderImage]}>
              <MaterialIcons name="movie" size={60} color="#555" />
              <Text style={styles.placeholderText}>No Image Available</Text>
            </View>
          )}
          
          <View style={styles.newsContent}>
            <View style={styles.newsHeader}>
              <Text style={styles.newsSource}>
                {getSourceDisplay(data.source)}
              </Text>
              <Text style={styles.newsDate}>
                {new Date(data.pubDate).toLocaleDateString()}
              </Text>
            </View>
            
            <View style={styles.newsBody}>
              <Text style={styles.newsTitle} numberOfLines={2}>
                {data.title}
              </Text>
              <Text style={styles.newsDescription} numberOfLines={3}>
                {data.description.replace(/<[^>]*>/g, '')}
              </Text>
            </View>

            <View style={styles.newsFooter}>
              <TouchableOpacity style={styles.readMoreButton}>
                <Text style={styles.readMoreText}>Read More</Text>
                <MaterialIcons name="arrow-forward" size={16} color="#BB86FC" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const PersonalFeed: React.FC = () => {
  const [newsItems, setNewsItems] = useState<RSSItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const feeds = await fetchRSSFeeds();
      console.log('Feeds received:', feeds.length);
      setNewsItems(feeds);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#BB86FC" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.feedContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      snapToInterval={SCREEN_HEIGHT - 120}
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
    >
      {newsItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No content available</Text>
        </View>
      ) : (
        newsItems.map((item, index) => (
          <NewsCard key={`${item.source}-${index}`} data={item} />
        ))
      )}
    </ScrollView>
  );
};

const PublicFeed: React.FC = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    setError(null);
    try {
      // Validate current user data first
      const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (!currentUserDoc.exists()) {
        throw new Error('Current user profile not found');
      }

      const matchResults = await calculateMatchScore(auth.currentUser.uid);
      
      // Filter out any invalid match data
      const validMatches = matchResults.filter(match => 
        match && 
        match.userId && 
        typeof match.score === 'number' && 
        Array.isArray(match.commonMovies) &&
        match.commonMovies.every(movie => 
          movie && 
          movie.movieId && 
          movie.category
        )
      );

      setMatches(validMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setError('Failed to load matches. Please try again.');
      
      // Show user-friendly error
      Platform.OS === 'android' 
        ? ToastAndroid.show('Error loading matches', ToastAndroid.SHORT)
        : Alert.alert('Error', 'Failed to load matches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#BB86FC" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchMatches}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.feedContainer}>
      <ChatList 
        matches={matches} 
        currentUserId={auth.currentUser?.uid || ''} 
      />
    </View>
  );
};

const CinePalScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('personal');

  const renderTab = () => {
    switch (activeTab) {
      case 'personal':
        return <PersonalFeed />;
      case 'public':
        return <PublicFeed />;
      default:
        return <PersonalFeed />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'personal' && styles.activeTab]}
          onPress={() => setActiveTab('personal')}
        >
          <Text style={[styles.tabText, activeTab === 'personal' && styles.activeTabText]}>
            For You
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'public' && styles.activeTab]}
          onPress={() => setActiveTab('public')}
        >
          <Text style={[styles.tabText, activeTab === 'public' && styles.activeTabText]}>
            Public
          </Text>
        </TouchableOpacity>
      </View>
      {renderTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1E1E1E',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#BB86FC', // Material Design purple for dark theme
  },
  tabText: {
    fontSize: 16,
    color: '#888',
  },
  activeTabText: {
    color: '#BB86FC',
    fontWeight: 'bold',
  },
  feedContainer: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 16,
  },
  feedText: {
    fontSize: 16,
  },
  cardContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  reelPreview: {
    height: 200,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  image: {
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardFooter: {
    padding: 12,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
    color: '#E1E1E1',
  },
  caption: {
    fontSize: 14,
    color: '#888',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  movieTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E1E1E1',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: 'bold',
  },
  reviewText: {
    padding: 12,
    paddingTop: 0,
    fontSize: 14,
    color: '#B0B0B0',
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  newsSource: {
    color: '#BB86FC',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  newsDate: {
    color: '#888',
    fontSize: 12,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E1E1E1',
    marginVertical: 8,
    lineHeight: 24,
  },
  newsDescription: {
    fontSize: 14,
    color: '#B0B0B0',
    lineHeight: 20,
  },
  newsImage: {
    height: '50%', // Take up half of card height
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#2A2A2A',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsContent: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  newsCardContainer: {
    height: SCREEN_HEIGHT - 160, // Account for padding
    overflow: 'hidden',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#BB86FC',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
  placeholderText: {
    color: '#555',
    marginTop: 8,
    fontSize: 14,
  },
  newsImageContainer: {
    height: '45%',
    width: '100%',
    position: 'relative',
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  matchAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  matchScore: {
    fontSize: 14,
    color: '#BB86FC',
  },
  fullCardContainer: {
    height: SCREEN_HEIGHT - 120, // Account for header and padding
    paddingVertical: 8,
    justifyContent: 'center',
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  newsImage: {
    height: '45%', // Take up half of card height
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#2A2A2A',
  },
  newsContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  newsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E1E1E1',
    lineHeight: 32,
  },
  newsDescription: {
    fontSize: 16,
    color: '#B0B0B0',
    lineHeight: 24,
    flex: 1,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  newsSource: {
    color: '#BB86FC',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  newsDate: {
    color: '#888',
    fontSize: 12,
  },
  cardInnerContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
  },
  newsImageWrapper: {
    height: '50%',
    width: '100%',
    backgroundColor: '#2A2A2A',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  newsImage: {
    width: '100%',
    height: '100%',
  },
  newsContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  newsBody: {
    flex: 1,
    gap: 8,
  },
  newsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E1E1E1',
    lineHeight: 28,
    marginBottom: 8,
  },
  newsDescription: {
    fontSize: 16,
    color: '#B0B0B0',
    lineHeight: 22,
  },
  newsFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  readMoreText: {
    color: '#BB86FC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  newsCardContainer: {
    height: SCREEN_HEIGHT - 160,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  matchedUserContainer: {
    flex: 1,
    width: '100%',
  },
});

export default CinePalScreen;
