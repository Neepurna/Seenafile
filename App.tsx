// App.tsx

import React from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import Tabs from './src/navigation/Tabs';
import MovieGridScreen from './src/screens/MovieGridScreen';
import MovieChatScreen from './src/screens/MovieChatScreen';
import UserProfileChatScreen from './src/screens/UserProfileChatScreen';
import { RootStackParamList } from './src/types/navigation';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <GestureHandlerRootView style={styles.container}>
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
            gestureEnabled: false,
            cardStyle: { backgroundColor: '#000' },
          }}
        >
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen 
            name="SignUp" 
            component={SignUpScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen 
            name="Tabs" 
            component={Tabs}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen 
            name="MovieGridScreen"
            component={MovieGridScreen}
            options={{
              headerShown: true,
              gestureEnabled: true,
              headerStyle: {
                backgroundColor: '#000',
              },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen 
            name="MovieChat"
            component={MovieChatScreen}
            options={{
              headerShown: true,
              gestureEnabled: true,
              headerStyle: {
                backgroundColor: '#000',
              },
              headerTintColor: '#fff',
              headerTitle: ({ route }: any) => route.params?.username || 'Chat',
            }}
          />
          <Stack.Screen 
            name="UserProfileChat"
            component={UserProfileChatScreen}
            options={({ route }) => ({
              headerShown: true,
              headerTitle: route?.params?.username || 'Profile',
              headerStyle: {
                backgroundColor: '#000',
              },
              headerTintColor: '#fff',
            })}
          />
        </Stack.Navigator>
      </GestureHandlerRootView>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
