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

type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Tabs: undefined;
};

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
