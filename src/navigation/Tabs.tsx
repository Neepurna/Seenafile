////////////////////////////////////////////////////////////////////////////////
// Tabs.tsx
////////////////////////////////////////////////////////////////////////////////
import React, { useState, useRef } from 'react';
import {
  PanResponder,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Animated,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ProfileScreen from '../screens/ProfileScreen';
import CineBrowseScreen from '../screens/CineBrowseScreen';
import CinePalScreen from '../screens/CinePalScreen';
import MyWallScreen from '../screens/MyWallScreen';
import MovieGridScreen from '../screens/MovieGridScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator<TabsStackParamList>();

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

const TAB_BAR_HEIGHT = 100; // Custom tab bar height

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
      <Tab.Navigator
        screenOptions={({ route, navigation }) => ({
          // Hide the header only on CineBrowse screen
          headerShown: route.name !== 'CineBrowse',
          tabBarShowLabel: false,
          headerTitle: '',
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
          tabBarIcon: ({ color, size }) => {
            let iconName: string;
            if (route.name === 'CineBrowse') {
              iconName = 'film-outline';
            } else if (route.name === 'CinePal') {
              iconName = 'people-outline';
            } else if (route.name === 'Profile') {
              iconName = 'person-circle-outline';
            }
            return <Ionicons name={iconName as any} size={size} color={color} />;
          },
          tabBarStyle: {
            height: TAB_BAR_HEIGHT,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            paddingBottom: 10,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            borderTopColor: 'rgba(255, 255, 255, 0.1)',
            zIndex: 1000,
          },
          headerStyle: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            height: 100,
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            zIndex: 1000,
          },
        })}
      >
        <Tab.Screen name="CineBrowse" component={CineBrowseScreen} />
        <Tab.Screen name="CinePal" component={CinePalScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
        <Tab.Screen
          name="MyWall"
          component={MyWallScreen}
          options={({ navigation }) => ({
            tabBarButton: () => null,
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{ marginLeft: 15 }}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
            ),
            headerTitle: 'User Profile',
          })}
        />
        <Tab.Screen
          name="MovieGridScreen"
          component={MovieGridScreen}
          options={({ route }) => ({
            tabBarButton: () => null,
            headerTitle: route.params?.folderName ?? 'Movies',
            headerStyle: { backgroundColor: '#000' },
            headerTintColor: '#fff',
          })}
        />
      </Tab.Navigator>

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
