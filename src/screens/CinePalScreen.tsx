// src/screens/CinePalScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

const PersonalFeed: React.FC = () => (
  <ScrollView style={styles.feedContainer}>
    <Text style={styles.feedText}>Personal Feed</Text>
    {/* Add your personal feed content here */}
  </ScrollView>
);

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
            Personal
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
      {activeTab === 'personal' ? <PersonalFeed /> : <PublicFeed />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  feedContainer: {
    flex: 1,
    padding: 16,
  },
  feedText: {
    fontSize: 16,
  }
});

export default CinePalScreen;
