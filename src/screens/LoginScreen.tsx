// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView } from 'react-native';
import { signIn, signUp, resendVerificationEmail, resetPassword } from '../firebase';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    const { user, error, needsVerification } = await signIn(email, password);
    setIsLoading(false);

    if (needsVerification) {
      Alert.alert(
        'Email Not Verified',
        'Please verify your email before logging in. Check your inbox or request a new verification email.',
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

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    if (user && user.emailVerified) {
      navigation.replace('Tabs');
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    const { user, error, message } = await signUp(email, password);
    setIsLoading(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    Alert.alert(
      'Success',
      'Please check your email to verify your account before logging in.',
      [{ text: 'OK' }]
    );
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
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.logoText}>Seenafile</Text>
        <Text style={styles.tagline}>Where Movie Lovers Connect</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          placeholderTextColor="#666"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#666"
        />
        
        <TouchableOpacity 
          style={styles.forgotPasswordButton} 
          onPress={handleForgotPassword}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.loginButton]} 
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Please wait..." : "Sign In"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.signupButton]} 
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={[styles.buttonText, styles.signupText]}>
            Create Account
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerContainer: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#E50914',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#FFF',
    marginTop: 10,
  },
  formContainer: {
    flex: 0.6,
    backgroundColor: '#141414',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingTop: 40,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 15,
    marginBottom: 16,
    color: '#FFF',
    fontSize: 16,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  loginButton: {
    backgroundColor: '#E50914',
  },
  signupButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E50914',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupText: {
    color: '#E50914',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#E50914',
    fontSize: 14,
  },
});

export default LoginScreen;
