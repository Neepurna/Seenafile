import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { View, TouchableOpacity } from 'react-native';
import MovieSearchScreen from '../screens/MovieSearchScreen';
import CineBrowseScreen from '../screens/CineBrowseScreen';
import CinePalScreen from '../screens/CinePalScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyWallScreen from '../screens/MyWallScreen';
import MovieGridScreen from '../screens/MovieGridScreen';
import UserProfileChatScreen from '../screens/UserProfileChatScreen';

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

// Modify UserProfileStack to be nested within ChatStack
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
      name="MovieGridScreen" 
      component={MovieGridScreen}
      options={{
        headerShown: true,
        headerTransparent: true,
        headerTintColor: '#fff',
        headerTitle: '',
        headerLeft: (props) => (
          <TouchableOpacity
            style={{ marginLeft: 16 }}
            onPress={() => {
              if (props.canGoBack) {
                props.navigation.goBack();
              }
            }}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        ),
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
        presentation: 'card',
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
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
