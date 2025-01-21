import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { View } from 'react-native';
import MovieSearchScreen from '../screens/MovieSearchScreen';
import CineBrowseScreen from '../screens/CineBrowseScreen';
import CinePalScreen from '../screens/CinePalScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyWallScreen from '../screens/MyWallScreen';
import MovieGridScreen from '../screens/MovieGridScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#000',
      },
      headerTitleStyle: {
        color: '#fff',
      },
      headerTintColor: '#fff',
    }}
  >
    <Stack.Screen 
      name="CineBrowse" 
      component={CineBrowseScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen name="MovieGridScreen" component={MovieGridScreen} />
    <Stack.Screen 
      name="MovieSearch" 
      component={MovieSearchScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          }

          return <Ionicons name={iconName} size={24} color="#fff" />;
        },
        tabBarStyle: {
          position: 'absolute',
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: 60
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#fff'
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Search" 
        component={MovieSearchScreen}
        options={{ 
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'search' : 'search-outline'} 
              size={24} 
              color="#fff" 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Chat" 
        component={CinePalScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
