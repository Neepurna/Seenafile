import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import CineBrowseScreen from '../screens/CineBrowseScreen';
import CinePalScreen from '../screens/CinePalScreen';
import CineFileScreen from '../screens/CineFileScreen';
import CineGamesScreen from '../screens/CineGamesScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const TAB_BAR_HEIGHT = 100; // Increased by 2% from 66 to 67

const Tabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: route.name === 'CineBrowse' ? false : true, // Hide header for CineBrowse
        tabBarIcon: ({ color, size }) => {
          let iconName: string;

          if (route.name === 'CineBrowse') {
            iconName = 'film-outline'; // Updated icon name
          } else if (route.name === 'CinePal') {
            iconName = 'people-outline'; // Updated icon name
          } else if (route.name === 'CineFile') {
            iconName = 'folder-outline'; // Updated icon name
          } else if (route.name === 'CineGames') {
            iconName = 'game-controller-outline'; // Updated icon name
          } else if (route.name === 'Profile') {
            iconName = 'person-outline'; // Updated icon name
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
        },
        headerTintColor: '#fff', // Make header text white for other screens
      })}
    >
      <Tab.Screen name="CineBrowse" component={CineBrowseScreen} />
      <Tab.Screen name="CinePal" component={CinePalScreen} />
      <Tab.Screen name="CineFile" component={CineFileScreen} />
      <Tab.Screen name="CineGames" component={CineGamesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default Tabs;
