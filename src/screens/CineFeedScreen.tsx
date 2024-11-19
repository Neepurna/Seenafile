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
      const reviewPromises = trendingMovies.results.slice(0, 5).map(async movie => {
        const movieReviews = await fetchMovieReviews(movie.id);
        // Attach movie details to each review
        return movieReviews.results.map(review => ({
          ...review,
          movie_details: {
            title: movie.title,
            poster_path: movie.poster_path,
            release_date: movie.release_date,
            id: movie.id
          }
        }));
      });
      
      const reviewsData = await Promise.all(reviewPromises);
      const allReviews = reviewsData.flat();
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

const NewsCard = ({ data }) => {
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
    <TouchableOpacity 
      style={styles.newsCardContainer}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.cardInnerContainer}>
        {data.imageUrl && !imageError ? (
          <View style={styles.newsImageContainer}>
            <Image 
              source={{ uri: data.imageUrl }}
              style={styles.newsImage}
              resizeMode="cover"
              onLoad={() => setImageLoading(false)}
              onError={() => setImageError(true)}
            />
            {imageLoading && (
              <View style={styles.imageLoadingOverlay}>
                <ActivityIndicator size="large" color="#BB86FC" />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <MaterialIcons name="movie" size={48} color="#555" />
          </View>
        )}
        
        <View style={styles.newsContentContainer}>
          <View style={styles.newsHeader}>
            <Text style={styles.newsSource}>
              {getSourceDisplay(data.source)}
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

          <View style={styles.newsFooter}>
            <Text style={styles.readMore}>Read More</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#BB86FC" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const ReviewCard = ({ data }) => {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewContent}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewHeaderLeft}>
            <Text style={styles.movieTitle}>
              {data.movie_details?.title || 'Unknown Movie'} ({data.movie_details?.release_date?.split('-')[0] || ''})
            </Text>
            <Text style={styles.authorName}>Review by {data.author}</Text>
          </View>
          <Text style={styles.reviewDate}>
            {new Date(data.created_at).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.reviewText} numberOfLines={5}>
          {data.content}
        </Text>
        {data.rating && (
          <View style={styles.ratingContainer}>
            <MaterialIcons name="star" size={16} color="#FFD700" />
            <Text style={styles.rating}>{data.rating}/10</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const ReelCard = ({ data }) => {
  return (
    <View style={styles.reelCard}>
      <WebView
        source={{ 
          uri: `https://www.youtube.com/embed/${data.videoId}?playsinline=1&autoplay=1` 
        }}
        style={styles.webview}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
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
    backgroundColor: '#000',
  },
  reviewCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  reviewContent: {
    padding: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  movieTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  authorName: {
    color: '#BB86FC',
    fontSize: 14,
  },
  reviewDate: {
    color: '#888',
    fontSize: 12,
  },
  reviewText: {
    color: '#B0B0B0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    color: '#FFD700',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: 'bold',
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  newsImageContainer: {
    height: 200,
    width: '100%',
    backgroundColor: '#2A2A2A',
  },
  placeholderImage: {
    height: 200,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsContent: {
    padding: 16,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  newsSource: {
    color: '#BB86FC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  newsDate: {
    color: '#888',
    fontSize: 12,
  },
  newsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  newsDescription: {
    color: '#B0B0B0',
    fontSize: 14,
    lineHeight: 20,
  },
  fullCardContainer: {
    height: SCREEN_HEIGHT - 120,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  cardContainer: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    overflow: 'hidden',
  },
  newsCardContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 16,
    height: 400, // Fixed height for consistent cards
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  cardInnerContainer: {
    flex: 1,
  },
  newsImageWrapper: {
    height: '45%', // Changed from 50% to 45% to match CinePalScreen
    width: '100%',
    backgroundColor: '#2A2A2A',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  newsBody: {
    flex: 1,
    gap: 8,
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
  placeholderText: {
    color: '#555',
    marginTop: 8,
    fontSize: 14,
  },
  newsImageContainer: {
    height: 200, // Fixed height for images
    width: '100%',
    backgroundColor: '#2A2A2A',
  },
  newsImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    height: 200,
    width: '100%',
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsContentContainer: {
    flex: 1,
    padding: 16,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
    lineHeight: 26,
  },
  newsDescription: {
    fontSize: 14,
    color: '#B0B0B0',
    lineHeight: 20,
    flex: 1,
  },
  newsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  readMore: {
    color: '#BB86FC',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default CineFeedScreen;