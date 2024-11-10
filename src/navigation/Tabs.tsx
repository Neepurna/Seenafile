import React, { useState, useRef, useEffect } from 'react';
import { 
  
  PanResponder,
  
  StyleSheet
} from 'react-native';
import { Modal, Animated, Dimensions } from 'react-native';
import ProfileScreen from '../screens/ProfileScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Text } from 'react-native';
import CineBrowseScreen from '../screens/CineBrowseScreen';
import CinePalScreen from '../screens/CinePalScreen';
import CineSearchScreen from '../screens/CineSearchScreen';
import CineFileScreen from '../screens/CineFileScreen';
import CineGamesScreen from '../screens/CineGamesScreen';

const Tab = createBottomTabNavigator();
const TAB_BAR_HEIGHT = 100; // Increased by 2% from 66 to 67

const Tabs: React.FC = () => {
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 100) {
          hideProfile();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const showProfile = () => {
    setIsProfileVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideProfile = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').width,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setIsProfileVisible(false));
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route, navigation }) => ({
          headerShown: true, // Show header for all screens
          tabBarShowLabel: false,
          headerTitle: 'SeenaFile',
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#fff',
          },
          headerRight: () => (
            <TouchableOpacity 
              onPress={showProfile}
              style={{ marginRight: 15 }}
            >
              <Ionicons name="person-circle-outline" size={30} color="#fff" />
            </TouchableOpacity>
          ),
          tabBarIcon: ({ color, size }) => {
            let iconName: string;

            if (route.name === 'CineBrowse') {
              iconName = 'film-outline'; // Updated icon name
            } else if (route.name === 'CinePal') {
              iconName = 'people-outline'; // Updated icon name
            } else if (route.name === 'CineSearch') {
              iconName = 'search-outline';
            } else if (route.name === 'CineFile') {
              iconName = 'folder-outline'; // Updated icon name
            } else if (route.name === 'CineGames') {
              iconName = 'game-controller-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarStyle: {
            height: TAB_BAR_HEIGHT,
            backgroundColor: '#000',
            paddingBottom: 10, // Add some padding for better touch targets
          },
          tabBarItemStyle: {
            padding: 5,
          },
          headerStyle: {
            backgroundColor: '#000', // Make header black for other screens
            height: 100, // Increased header height
          },
          headerTintColor: '#fff', // Make header text white for other screens
        })}
      >
        <Tab.Screen name="CineBrowse" component={CineBrowseScreen} />
        <Tab.Screen name="CinePal" component={CinePalScreen} />
        <Tab.Screen name="CineSearch" component={CineSearchScreen} />
        <Tab.Screen name="CineFile" component={CineFileScreen} />
        <Tab.Screen name="CineGames" component={CineGamesScreen} />
      </Tab.Navigator>

      {isProfileVisible && (
        <Animated.View style={[styles.overlay, { opacity: backdropAnim }]}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={hideProfile}
          />
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.profilePanel,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <ProfileScreen onClose={hideProfile} />
          </Animated.View>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  profilePanel: {
    position: 'absolute',
    right: 0,
    width: '75%',
    height: '100%',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default Tabs;
