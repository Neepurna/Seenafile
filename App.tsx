import React from 'react';
import 'react-native-gesture-handler';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './src/screens/LoginScreen';
import Tabs from './src/navigation/Tabs';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }} // Hides the header on the LoginScreen
        />
        <Stack.Screen
          name="Tabs"
          component={Tabs}
          options={{ headerShown: false }} // Hides the header on the Tabs screen
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
