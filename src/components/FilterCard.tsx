import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DIMS } from '../theme';  // Make sure this import is at the top

const { width } = Dimensions.get('window');

interface FilterCardProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onAddCustomCategory: () => void;
  categories: string[];
  customCategories: string[];
}

const FilterCard: React.FC<FilterCardProps> = ({
  selectedCategory,
  onSelectCategory,
  onAddCustomCategory,
  categories,
  customCategories,
}) => {
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const slideAnim = new Animated.Value(width); // Changed from -width to width

  const toggleCategoryPanel = () => {
    const toValue = showCategoryPanel ? width : 0; // Changed from -width to width
    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
    setShowCategoryPanel(!showCategoryPanel);
  };

  const renderMainFilter = () => (
    <View style={styles.filterContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {[
          'All',
          'Top Rated',
          'Classics',
          'Award Winners',
          "Critics' Choice",
          'International',
          'TV Shows',
          'Documentaries'
        ].map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryPill,
              selectedCategory === category && styles.selectedPill,
            ]}
            onPress={() => onSelectCategory(category)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.selectedText,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity
        style={styles.addButton}
        onPress={toggleCategoryPanel}
      >
        <Ionicons 
          name={showCategoryPanel ? "close-circle-outline" : "add-circle-outline"} 
          size={24} 
          color="#fff" 
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderMainFilter()}
      <Animated.View 
        style={[
          styles.categoryPanel,
          { transform: [{ translateX: slideAnim }] }
        ]}
      >
        <ScrollView style={styles.categoryList}>
          {categories
            .filter(cat => ![
              'All',
              'Trending',
              'New Releases',
              'Top Rated',
              'Classics',
              'Award Winners',
              "Critics' Choice",
              'International',
              'TV Shows',
              'Documentaries'
            ].includes(cat))
            .map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryListItem,
                  selectedCategory === category && styles.selectedListItem,
                ]}
                onPress={() => {
                  onSelectCategory(category);
                  toggleCategoryPanel();
                }}
              >
                <Text style={styles.categoryListText}>{category}</Text>
              </TouchableOpacity>
            ))}
          {customCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryListItem,
                selectedCategory === category && styles.selectedListItem,
              ]}
              onPress={() => {
                onSelectCategory(category);
                toggleCategoryPanel();
              }}
            >
              <Text style={styles.categoryListText}>{category}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addCategoryButton}
            onPress={onAddCustomCategory}
          >
            <Text style={styles.addCategoryText}>Add Custom Category</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: DIMS.filterHeight,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    padding: 0,
    margin: 0,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 10,
    height: DIMS.filterHeight,
  },
  scrollContent: {
    paddingLeft: 16,
    flexGrow: 1,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 80,
    alignItems: 'center',
  },
  selectedPill: {
    backgroundColor: '#fff',
  },
  categoryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedText: {
    color: '#000',
  },
  addButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  categoryPanel: {
    position: 'absolute',
    top: 0,
    right: 0, // Changed from left to right
    width: width * 0.8,
    height: '100%',
    backgroundColor: '#1a1a1a',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 }, // Changed shadow direction
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  categoryList: {
    padding: 16,
  },
  categoryListItem: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
    borderRadius: 8,
  },
  selectedListItem: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  categoryListText: {
    color: '#fff',
    fontSize: 16,
  },
  addCategoryButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
  },
  addCategoryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FilterCard;