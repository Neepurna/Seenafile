import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FilterCard from './FilterCard'; // Assuming you have a FilterCard component

const defaultCategories = ["All", "Action", "Comedy", "Drama"];

const CineBrowseScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  return (
    <View className="flex-1 bg-primary">
      {/* Header Section */}
      <View className="flex-row items-center justify-between px-4 h-header bg-primary border-b border-accent pt-status-bar-ios">
        <Text className="text-2xl font-bold text-textPrimary">SeenaFile</Text>
        <TouchableOpacity className="p-2.5">
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="px-4 pt-2 bg-primary">
        <TouchableOpacity
          activeOpacity={1}
          className="flex-row items-center bg-secondary rounded-full px-4 h-[46px]"
          onPress={() => searchInputRef.current?.focus()}
        >
          <TextInput
            ref={searchInputRef}
            className="flex-1 text-textPrimary text-base py-2"
            placeholder="Search movies & TV shows..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              className="p-1"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="search" size={20} color="#666" />
          )}
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View className="flex-1 relative">
        {/* ...existing conditional rendering logic... */}
      </View>

      {/* Bottom Controls */}
      <View className="absolute bottom-0 left-0 right-0 bg-primary pb-2.5 border-t border-accent z-overlay">
        <View className="px-4 pt-2.5 mb-2">
          <FilterCard
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
            categories={defaultCategories}
            className="h-10 bg-secondary/80"
          />
        </View>
      </View>
    </View>
  );
};

export default CineBrowseScreen;
