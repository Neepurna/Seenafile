// src/screens/LoginScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  SafeAreaView,
  ImageBackground,
  Image,
  Text,
  TouchableOpacity,
} from 'react-native';
import { signIn, signUp, resendVerificationEmail, resetPassword, createUserWithProfile } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthDrawer from '../components/auth/AuthDrawer';
import SignUpDrawer from '../components/auth/SignUpDrawer';

const LoginScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthDrawer, setShowAuthDrawer] = useState(false);
  const [showSignUpDrawer, setShowSignUpDrawer] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { user, error, needsVerification } = await signIn(email, password);
      
      if (error) {
        Alert.alert('Error', error);
        return;
      }

      if (needsVerification) {
        Alert.alert(
          'Email Not Verified',
          'Please verify your email before logging in.',
          [
            { text: 'OK' },
            { 
              text: 'Resend Email',
              onPress: () => handleResendVerification(user)
            }
          ]
        );
        return;
      }

      if (user) {
        await AsyncStorage.setItem('userToken', user.uid);
        await AsyncStorage.setItem('userEmail', user.email);
        setShowAuthDrawer(false); // Close drawer on success
        navigation.replace('Main');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (formData) => {
    try {
      setIsLoading(true);
      const { error, message } = await createUserWithProfile(formData);
      
      if (error) {
        Alert.alert('Error', error);
        return;
      }

      setShowSignUpDrawer(false);
      Alert.alert(
        'Success',
        'Please check your email to verify your account before logging in.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async (user) => {
    const { error, message } = await resendVerificationEmail(user);
    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Success', message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      setIsLoading(true);
      const { error, message } = await resetPassword(email.trim().toLowerCase());
      
      if (error) {
        Alert.alert('Error', error);
      } else {
        Alert.alert(
          'Success', 
          message,
          [{ text: 'OK', onPress: () => setEmail('') }]
        );
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/background.jpg')}
      style={styles.backgroundImage}
      blurRadius={10}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContent}>
            <View style={styles.logoWrapper}>
              <View style={styles.logoCircle}>
                <Image
                  source={require('../../assets/splash.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.logoText}>SEENAFILE</Text>
            <Text style={styles.tagline}>Where Movie Lovers Connect</Text>
            
            <TouchableOpacity 
              style={styles.signInButton}
              onPress={() => setShowAuthDrawer(true)}
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.signInButton, styles.createAccountButton]}
              onPress={() => setShowSignUpDrawer(true)}
            >
              <Text style={[styles.signInButtonText, styles.createAccountText]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          <AuthDrawer
            visible={showAuthDrawer}
            onClose={() => setShowAuthDrawer(false)}
            onLogin={handleLogin}
            onForgotPassword={handleForgotPassword}
            isLoading={isLoading}
          />

          <SignUpDrawer
            visible={showSignUpDrawer}
            onClose={() => setShowSignUpDrawer(false)}
            onSignUp={handleSignUp}
            isLoading={isLoading}
          />
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(25px)',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoWrapper: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 80,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
  },
  logo: {
    width: 120,
    height: 120,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: -2, height: 2 },
    textShadowRadius: 15,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    color: '#999',
    letterSpacing: 1,
    marginBottom: 40,
  },
  signInButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  signInButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  createAccountButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    marginTop: 16,
  },
  createAccountText: {
    color: '#FFF',
  },
});

export default LoginScreen;
