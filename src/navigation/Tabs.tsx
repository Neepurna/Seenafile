////////////////////////////////////////////////////////////////////////////////
// Tabs.tsx
////////////////////////////////////////////////////////////////////////////////
import React, { useState, useRef } from 'react';
import {
  PanResponder,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import ProfileScreen from '../screens/ProfileScreen';
import CineBrowseScreen from '../screens/CineBrowseScreen';
import CinePalScreen from '../screens/CinePalScreen';
import MyWallScreen from '../screens/MyWallScreen';
import MovieGridScreen from '../screens/MovieGridScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createStackNavigator<TabsStackParamList>();

type TabsStackParamList = {
  CineBrowse: undefined;
  CinePal: undefined;
  Profile: undefined;
  MyWall: {
    userId: string;
    username: string;
    matchScore: number;
  };
  MovieGridScreen: {
    folderId: string;
    folderName: string;
    folderColor: string;
  };
};

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
      <Stack.Navigator
        screenOptions={({ navigation }) => ({
          headerStyle: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            height: 100,
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          },
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#fff',
          },
          headerRight: () => (
            <TouchableOpacity onPress={showProfile} style={{ marginRight: 15 }}>
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        })}
      >
        <Stack.Screen 
          name="CineBrowse" 
          component={CineBrowseScreen}
          options={{ headerTitle: '' }}
        />
        <Stack.Screen 
          name="CinePal" 
          component={CinePalScreen} 
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen} 
        />
        <Stack.Screen
          name="MyWall"
          component={MyWallScreen}
          options={{
            headerTitle: 'User Profile',
            headerLeft: ({ onPress }) => (
              <TouchableOpacity
                onPress={onPress}
                style={{ marginLeft: 15 }}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
            ),
          }}
        />
        <Stack.Screen
          name="MovieGridScreen"
          component={MovieGridScreen}
          options={({ route }) => ({
            headerTitle: route.params?.folderName ?? 'Movies',
          })}
        />
      </Stack.Navigator>

      {isProfileVisible && (
        <Animated.View style={[styles.overlay, { opacity: backdropAnim, zIndex: 2000 }]}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={hideProfile}
          />
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.profilePanel,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            <SettingsScreen onClose={hideProfile} />
          </Animated.View>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
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
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
export default Tabs;
