// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.contentWrapper}>
                <View style={styles.headerContainer}>
                  <Text style={styles.logoText}>SEENAFILE</Text>
                  <Text style={styles.tagline}>Where Movie Lovers Connect</Text>
                </View>

                <View style={styles.formContainer}>
                  <TextInput
                    style={[styles.input, Platform.OS === 'android' && styles.androidInput]}
                    placeholder="Email"
                    value={email}
                    onChangeText={(text) => setEmail(text.trim())}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    placeholderTextColor="#999"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    enablesReturnKeyAutomatically
                  />
                  <TextInput
                    style={[styles.input, Platform.OS === 'android' && styles.androidInput]}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholderTextColor="#999"
                    returnKeyType="done"
                    blurOnSubmit={true}
                    enablesReturnKeyAutomatically
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
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingBottom: 20,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
    minHeight: Platform.OS === 'ios' ? '100%' : 'auto',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 3,
  },
  tagline: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    letterSpacing: 1,
  },
  formContainer: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    marginTop: 20,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
    height: Platform.OS === 'ios' ? 50 : 56,
    textAlignVertical: 'center',
  },
  androidInput: {
    paddingVertical: 8,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 8,
  },
  loginButton: {
    backgroundColor: '#FFF',
  },
  signupButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  signupText: {
    color: '#FFF',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#999',
    fontSize: 14,
  },
});

export default LoginScreen;
