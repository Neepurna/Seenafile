import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { View, TouchableOpacity, Platform } from 'react-native';
import MovieSearchScreen from '../screens/MovieSearchScreen';
import CineBrowseScreen from '../screens/CineBrowseScreen';
import CinePalScreen from '../screens/CinePalScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyWallScreen from '../screens/MyWallScreen';
import MovieGridScreen from '../screens/MovieGridScreen';
import UserProfileChatScreen from '../screens/UserProfileChatScreen';
import ProfileMovieGrid from '../screens/ProfileMovieGrid';
import UserMovieCollectionScreen from '../screens/UserMovieCollectionScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const commonHeaderStyle = {
  backgroundColor: '#000000',
  elevation: 0,
  shadowOpacity: 0,
  borderBottomWidth: 1,
  borderBottomColor: '#222',
  height: Platform.OS === 'ios' ? 90 : 70,
  opacity: 1,
};

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

// Update UserProfileStack to properly handle nested navigation
const UserProfileStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: '#000' },
    }}
  >
    <Stack.Screen 
      name="UserProfileMain" 
      component={UserProfileChatScreen} 
    />
    <Stack.Screen 
      name="UserMovieCollection" 
      component={MovieGridScreen}
      options={{
        headerShown: true,
        headerStyle: commonHeaderStyle,
        headerTitleStyle: {
          color: '#fff',
          fontSize: 18,
          fontWeight: 'bold',
        },
        headerTitleAlign: 'center',
        headerTitleContainerStyle: {
          paddingTop: Platform.OS === 'ios' ? 10 : 0,
        },
        headerLeftContainerStyle: {
          paddingLeft: 16,
          paddingTop: Platform.OS === 'ios' ? 10 : 0,
        },
        headerRightContainerStyle: {
          paddingRight: 16,
          paddingTop: Platform.OS === 'ios' ? 10 : 0,
        },
        headerTintColor: '#fff',
        cardStyle: { backgroundColor: '#000' }
      }}
    />
  </Stack.Navigator>
);

// Update ProfileStack to include unique route names
const ProfileStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: '#000' },
    }}
  >
    <Stack.Screen 
      name="ProfileMain" 
      component={ProfileScreen} 
    />
    <Stack.Screen 
      name="MovieGridScreen"
      component={MovieGridScreen}
      options={{
        headerShown: true,
        headerStyle: commonHeaderStyle,
        headerTitleStyle: {
          color: '#fff',
          fontSize: 18,
        },
        headerTitleAlign: 'center',
        headerLeftContainerStyle: {
          paddingLeft: 16,
        },
        headerRightContainerStyle: {
          paddingRight: 16,
        },
        headerTintColor: '#fff',
      }}
    />
  </Stack.Navigator>
);

const ChatStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: '#000' },
    }}
  >
    <Stack.Screen name="CinePal" component={CinePalScreen} />
    <Stack.Screen 
      name="UserProfile" 
      component={UserProfileStack}
      options={{
        presentation: 'modal',
        animationEnabled: true,
      }}
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
          }

          return <Ionicons name={iconName} size={24} color="#fff" />;
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: '#000',
          borderTopColor: '#222',
          borderTopWidth: 1,
          height: 60,
          zIndex: 0,
        },
        tabBarBackground: () => (
          <View style={{ 
            position: 'absolute', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            height: 60, 
            backgroundColor: '#000',
            borderTopColor: '#222',
            borderTopWidth: 1,
          }} />
        ),
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
        name="Chat" 
        component={ChatStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack} // Changed from ProfileScreen to ProfileStack
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
