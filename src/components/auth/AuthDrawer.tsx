import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';

const { height, width } = Dimensions.get('window');

interface AuthDrawerProps {
  visible: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => void;
  onForgotPassword: (email: string) => void;
  isLoading: boolean;
}

const AuthDrawer: React.FC<AuthDrawerProps> = ({
  visible,
  onClose,
  onLogin,
  onForgotPassword,
  isLoading,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      // Start animations and focus input simultaneously
      const animationPromise = new Promise(resolve => {
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 12,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          })
        ]).start(resolve);
      });

      // Focus the email input immediately when drawer starts opening
      emailInputRef.current?.focus();
    } else {
      Keyboard.dismiss();
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -width,
          useNativeDriver: true,
          tension: 50,
          friction: 12,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleLogin = () => {
    // Trim and validate inputs
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Validate password
    if (!trimmedPassword || trimmedPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    // If all validations pass
    Keyboard.dismiss();
    onLogin(trimmedEmail, trimmedPassword);
  };

  // Clear inputs when drawer closes
  useEffect(() => {
    if (!visible) {
      setEmail('');
      setPassword('');
    }
  }, [visible]);

  const handleForgotPassword = () => {
    Keyboard.dismiss();
    onForgotPassword(email);
  };

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
          pointerEvents: visible ? 'auto' : 'none',
        },
      ]}
    >
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateX: slideAnim }],
              opacity: fadeAnim,
              marginTop: -(height * 0.4), // Move up by 30% of screen height
            },
          ]}
        >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.content}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            >
              <View style={styles.header}>
                <Text style={styles.title}>Sign In</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeText}>×</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                ref={emailInputRef}
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={text => setEmail(text.trim())}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#999"
                returnKeyType="next"
                autoComplete="email"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
              />

              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#999"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <TouchableOpacity 
                style={styles.button}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Please wait..." : "Sign In"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleForgotPassword}
                style={styles.forgotButton}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
    minHeight: height * 0.4,
    maxHeight: height * 0.7,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 10,
  },
  closeText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
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
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotText: {
    color: '#999',
    fontSize: 14,
  },
});

export default AuthDrawer;
