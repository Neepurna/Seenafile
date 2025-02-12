// App.tsx

import React from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import MainNavigator from './src/navigation/MainNavigator';
import MovieChatScreen from './src/screens/MovieChatScreen';
import UserProfileChatScreen from './src/screens/UserProfileChatScreen';
import { RootStackParamList } from './src/types/navigation';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar style="light" />
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#000' },
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="Main" component={MainNavigator} />
          <Stack.Screen 
            name="MovieChat"
            component={MovieChatScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#000' },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen 
            name="UserProfileChat"
            component={UserProfileChatScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: '#000' },
              headerTintColor: '#fff',
            }}
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
