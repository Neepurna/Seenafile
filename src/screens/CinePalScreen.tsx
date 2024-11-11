// src/screens/CinePalScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Linking, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons'; // Replace the icon import
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { fetchRSSFeeds } from '../services/rssFeedService';
import type { RSSItem } from '../types/rss';

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

  const handleImageLoad = () => {
    console.log('Image loaded successfully:', data.imageUrl);
    setImageLoading(false);
  };

  const handleImageError = () => {
    console.log('Image failed to load:', data.imageUrl);
    setImageError(true);
    setImageLoading(false);
  };

  return (
    <View style={styles.fullCardContainer}>
      <TouchableOpacity 
        style={[styles.cardContainer, styles.newsCardContainer]}
        onPress={() => data.link && Linking.openURL(data.link)}
        activeOpacity={0.7}
      >
        {data.imageUrl && !imageError ? (
          <>
            <Image 
              source={{ uri: data.imageUrl }}
              style={styles.newsImage}
              resizeMode="cover"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            {imageLoading && (
              <View style={styles.imageLoadingContainer}>
                <ActivityIndicator color="#BB86FC" size="large" />
              </View>
            )}
          </>
        ) : (
          <View style={[styles.newsImage, styles.placeholderImage]}>
            <MaterialIcons name="movie" size={40} color="#666" />
          </View>
        )}
        <View style={styles.newsContent}>
          <View style={styles.newsHeader}>
            <Text style={styles.newsSource}>
              {data.source.replace('lwliesReviews', 'LWLies Reviews')}
            </Text>
            <Text style={styles.newsDate}>
              {new Date(data.pubDate).toLocaleDateString()}
            </Text>
          </View>
          <Text style={styles.newsTitle} numberOfLines={2}>
            {data.title}
          </Text>
          <Text style={styles.newsDescription} numberOfLines={3}>
            {data.description.replace(/<[^>]*>/g, '')}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const PersonalFeed: React.FC = () => {
  const [sharedReviews, setSharedReviews] = useState<any[]>([]);
  const [newsItems, setNewsItems] = useState<RSSItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load RSS feeds
      console.log('Fetching RSS feeds...');
      const feeds = await fetchRSSFeeds();
      console.log('Feeds received:', feeds.length);
      setNewsItems(feeds);

      // Load reviews
      const reviewsRef = collection(db, 'sharedReviews');
      const q = query(reviewsRef, orderBy('createdAt', 'desc'));
      
      const snapshot = await getDocs(q);
      const reviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Reviews received:', reviews.length);
      setSharedReviews(reviews);

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
      snapToInterval={SCREEN_HEIGHT - 120} // Account for header and padding
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
    >
      {newsItems.length === 0 && sharedReviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No content available</Text>
        </View>
      ) : (
        <>
          {newsItems.map((item, index) => (
            <NewsCard key={`${item.source.title}-${index}`} data={item} />
          ))}
          {sharedReviews.map(review => (
            <ReviewCard key={review.id} data={review} />
          ))}
        </>
      )}
    </ScrollView>
  );
};

const PublicFeed: React.FC = () => (
  <ScrollView style={styles.feedContainer}>
    <Text style={styles.feedText}>Public Feed</Text>
    {/* Add your public feed content here */}
  </ScrollView>
);

const CinePalScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'personal' | 'public'>('personal');

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'personal' && styles.activeTab]}
          onPress={() => setActiveTab('personal')}
        >
          <Text style={[styles.tabText, activeTab === 'personal' && styles.activeTabText]}>
            CineWall
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'public' && styles.activeTab]}
          onPress={() => setActiveTab('public')}
        >
          <Text style={[styles.tabText, activeTab === 'public' && styles.activeTabText]}>
            CinePal
          </Text>
        </TouchableOpacity>
      </View>
      {activeTab === 'personal' ? <PersonalFeed /> : <PublicFeed />}
      <FloatingActionButton />
    </View>
  );
};

const FloatingActionButton: React.FC = () => (
  <TouchableOpacity style={styles.fab}>
    <MaterialIcons name="add" size={24} color="#FFF" />
  </TouchableOpacity>
);

const additionalStyles = StyleSheet.create({
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
});

const newStyles = {
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
  newsCardContainer: {
    height: SCREEN_HEIGHT - 160, // Account for padding
  },
  newsImage: {
    height: '50%', // Take up half of card height
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#2A2A2A',
  },
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#BB86FC',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
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
  },
  ...additionalStyles,
  ...newStyles,
});

export default CinePalScreen;
