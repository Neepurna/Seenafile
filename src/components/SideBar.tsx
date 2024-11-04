import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

interface SideBarProps {
  onLove?: () => void;
  onComment?: () => void;
  onAddToList?: () => void;
  isLoved?: boolean;
}

const SideBar: React.FC<SideBarProps> = ({
  onLove,
  onComment,
  onAddToList,
  isLoved = false,
}) => {
  const [loved, setLoved] = useState(isLoved);

  const handleLoveClick = () => {
    setLoved(!loved);
    if (onLove) onLove();
  };

  return (
    <View style={styles.sidebarContainer}>
      <View style={styles.iconContainer}>
        <TouchableOpacity onPress={handleLoveClick}>
          <Ionicons 
            name={loved ? "heart" : "heart-outline"} 
            size={24} 
            color={loved ? "#ff0000" : "#ffffff"} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.iconContainer}>
        <TouchableOpacity onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.iconContainer}>
        <TouchableOpacity onPress={onAddToList}>
          <Ionicons name="add-circle-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebarContainer: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    flexDirection: 'column', // Change to vertical layout
    alignItems: 'center',
    zIndex: 999,
  },
  iconContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 25,
    padding: 8,
    marginVertical: 8, // Add vertical spacing between icons
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default SideBar;
