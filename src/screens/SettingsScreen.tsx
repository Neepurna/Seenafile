import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth, signOut } from '../firebase';

interface SettingsScreenProps {
  onClose?: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
  const navigation = useNavigation();

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          onPress: async () => {
            try {
              await signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      title: 'Profile Management',
      icon: 'person-circle-outline',
      onPress: () => navigation.navigate('Profile'),
      iconType: 'ionicons'
    },
    {
      title: 'Settings',
      icon: 'settings-outline',
      onPress: () => navigation.navigate('AppSettings'),
      iconType: 'ionicons'
    },
    {
      title: 'About Us',
      icon: 'information-circle-outline',
      onPress: () => navigation.navigate('AboutUs'),
      iconType: 'ionicons'
    },
    {
      title: 'Sign Out',
      icon: 'logout',
      onPress: handleSignOut,
      iconType: 'material'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            {item.iconType === 'ionicons' ? (
              <Ionicons name={item.icon as any} size={24} color="#FFF" />
            ) : (
              <MaterialIcons name={item.icon as any} size={24} color="#FFF" />
            )}
            <Text style={styles.menuText}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  closeButton: {
    padding: 8,
  },
  menuContainer: {
    marginTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  menuText: {
    fontSize: 16,
    color: '#FFF',
    marginLeft: 15,
    flex: 1,
  }
});

export default SettingsScreen;
