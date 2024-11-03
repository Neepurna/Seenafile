import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import CineBrowseScreen from '../screens/CineBrowseScreen';
import CinePalScreen from '../screens/CinePalScreen';
import CineFileScreen from '../screens/CineFileScreen';
import CineGamesScreen from '../screens/CineGamesScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const Tabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
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
