import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DIMS } from '../theme';

const { width } = Dimensions.get('window');

export interface FilterCardProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categories: string[];
  containerStyle?: StyleProp<ViewStyle>;
  className?: string;  // Make className optional
}

const FilterCard: React.FC<FilterCardProps> = ({
  selectedCategory,
  onSelectCategory,
  categories,
  containerStyle,
  className = '',  // Provide default empty string
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        className={`flex-row ${className}`}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.selectedCategory
            ]}
            onPress={() => onSelectCategory(category)}
            className={`px-4 py-2 rounded-full mr-2 ${
              selectedCategory === category ? 'bg-accent' : 'bg-secondary'
            }`}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === category && styles.selectedCategoryText
            ]}
            className={`${
              selectedCategory === category ? 'text-primary' : 'text-textSecondary'
            }`}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 10,
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  categoriesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 6,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedCategory: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  categoryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#000',
    fontWeight: '600',
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
    right: 0,
    width: width * 0.8,
    height: '100%',
    backgroundColor: '#1a1a1a',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
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