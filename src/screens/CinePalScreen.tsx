// src/screens/CinePalScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

const ReelCard: React.FC<{data: any}> = ({ data }) => (
  <View style={styles.cardContainer}>
    <View style={styles.reelPreview}>
      <Icon name="play-circle" size={40} color="#FFF" />
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
        <Icon name="star" size={20} color="#FFD700" />
        <Text style={styles.ratingText}>{data.rating}/5</Text>
      </View>
    </View>
    <Text style={styles.reviewText}>{data.review}</Text>
  </View>
);

const PersonalFeed: React.FC = () => {
  const [sharedReviews, setSharedReviews] = useState<any[]>([]);

  useEffect(() => {
    const reviewsRef = collection(db, 'sharedReviews');
    const q = query(reviewsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSharedReviews(reviews);
    });

    return () => unsubscribe();
  }, []);

  return (
    <ScrollView style={styles.feedContainer}>
      {sharedReviews.map(review => (
        <ReviewCard
          key={review.id}
          data={{
            username: review.username,
            movieTitle: review.movieTitle,
            rating: review.rating,
            review: review.review,
            timestamp: review.timestamp,
            likes: review.likes
          }}
        />
      ))}
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
    <Icon name="add" size={24} color="#FFF" />
  </TouchableOpacity>
);

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
    padding: 16,
    backgroundColor: '#121212',
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
});

export default CinePalScreen;
