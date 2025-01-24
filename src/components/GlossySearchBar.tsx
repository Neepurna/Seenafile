import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GlossySearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
  style?: ViewStyle;
}

const GlossySearchBar: React.FC<GlossySearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search movies...',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.7)" />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          selectionColor="rgba(255, 255, 255, 0.7)"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={onClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.7)" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 0,
    width: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // More transparent
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 45,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        backdropFilter: 'blur(10px)',
      },
      android: {
        elevation: 5,
        // For Android, we'll add a subtle gradient
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
      },
    }),
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
    paddingVertical: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  clearButton: {
    padding: 6,
    marginLeft: 5,
  },
});

export default GlossySearchBar;
