import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Linking, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchRSSFeeds } from '../services/rssFeedService';
import { fetchMovieReviews, fetchTrendingMovies } from '../services/tmdb';
import type { RSSItem } from '../types/rss';
import WebView from 'react-native-webview';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const CineFeedScreen = () => {
  const [activeTab, setActiveTab] = useState('News');
  const [newsItems, setNewsItems] = useState<RSSItem[]>([]);
  const [reviews, setReviews] = useState([]);
  const [reels, setReels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNews = async () => {
    try {
      const feeds = await fetchRSSFeeds();
      setNewsItems(feeds);
    } catch (error) {
      console.error('Error loading news:', error);
    }
  };

  const loadReviews = async () => {
    try {
      const trendingMovies = await fetchTrendingMovies();
      const reviewPromises = trendingMovies.results.slice(0, 5).map(movie => 
        fetchMovieReviews(movie.id)
      );
      const reviewsData = await Promise.all(reviewPromises);
      const allReviews = reviewsData.flatMap(data => data.results);
      setReviews(allReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const loadReels = async () => {
    try {
      // Example query to fetch latest movie trailers
      const searchQuery = 'new movie trailers 2024 shorts';
      // You'll need to implement the YouTube API service
      // const reelsData = await fetchYouTubeShorts(searchQuery);
      // setReels(reelsData);
      // For now, using placeholder data
      setReels([{ id: '1', videoId: 'example' }]);
    } catch (error) {
      console.error('Error loading reels:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadNews(), loadReviews(), loadReels()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadNews(), loadReviews(), loadReels()]);
    setRefreshing(false);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#BB86FC" />
        </View>
      );
    }

    switch(activeTab) {
      case 'News':
        return (
          <ScrollView 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            style={styles.contentContainer}
          >
            {newsItems.map((item, index) => (
              <NewsCard key={`${item.source}-${index}`} data={item} />
            ))}
          </ScrollView>
        );
      
      case 'Reviews':
        return (
          <ScrollView 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            style={styles.contentContainer}
          >
            {reviews.map((review, index) => (
              <ReviewCard key={index} data={review} />
            ))}
          </ScrollView>
        );
      
      case 'Reels':
        return (
          <ScrollView 
            pagingEnabled
            snapToInterval={SCREEN_HEIGHT}
            decelerationRate="fast"
            style={styles.reelsContainer}
          >
            {reels.map((reel, index) => (
              <ReelCard key={index} data={reel} />
            ))}
          </ScrollView>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {['News', 'Reviews', 'Reels'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {renderContent()}
    </View>
  );
};

// Component definitions for NewsCard, ReviewCard, and ReelCard
const NewsCard = ({ data }) => {
  // ... existing NewsCard implementation from CinePalScreen
};

const ReviewCard = ({ data }) => {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.authorName}>{data.author}</Text>
        <Text style={styles.reviewDate}>
          {new Date(data.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.reviewContent}>{data.content}</Text>
      <Text style={styles.rating}>Rating: {data.rating || 'N/A'}</Text>
    </View>
  );
};

const ReelCard = ({ data }) => {
  return (
    <View style={styles.reelCard}>
      <WebView
        source={{ uri: `https://www.youtube.com/embed/${data.videoId}` }}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
  },
  activeTabText: {
    color: '#fff',
  },
  contentContainer: {
    flex: 1,
    padding: 10,
  },
  // News styles
  newsItem: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#111',
    borderRadius: 8,
    overflow: 'hidden',
  },
  newsImage: {
    width: 100,
    height: 100,
    backgroundColor: '#333',
  },
  newsText: {
    flex: 1,
    padding: 10,
  },
  newsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  newsDescription: {
    color: '#999',
    fontSize: 14,
    marginTop: 5,
  },
  // Recommendation styles
  recommendationItem: {
    marginBottom: 20,
    alignItems: 'center',
  },
  moviePoster: {
    width: 150,
    height: 225,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  movieTitle: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  matchText: {
    color: '#4CAF50',
    fontSize: 14,
    marginTop: 5,
  },
  // Review styles
  reviewItem: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    marginRight: 10,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 10,
  },
  rating: {
    color: '#FFD700',
    fontSize: 16,
  },
  reelsContainer: {
    flex: 1,
  },
  reelCard: {
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
  reviewCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  authorName: {
    color: '#BB86FC',
    fontWeight: 'bold',
  },
  reviewDate: {
    color: '#888',
  },
  reviewContent: {
    color: '#FFF',
    lineHeight: 20,
    marginBottom: 8,
  },
  rating: {
    color: '#FFD700',
  },
});

export default CineFeedScreen;