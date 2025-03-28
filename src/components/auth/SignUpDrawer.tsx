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

interface SignUpDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSignUp: (formData: {
    name: string;
    dob: string;
    email: string;
    password: string;
    gender: string;
  }) => void;
  isLoading: boolean;
}

const SignUpDrawer: React.FC<SignUpDrawerProps> = ({
  visible,
  onClose,
  onSignUp,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    email: '',
    password: '',
    gender: 'not_specified',
  });
  const [dobPlaceholder, setDobPlaceholder] = useState('DD/MM/YYYY');
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const validateDate = (text: string) => {
    text = text.replace(/[^\d/]/g, '');
    
    if (text.length < formData.dob.length) {
      setDobPlaceholder('DD/MM/YYYY');
      setFormData(prev => ({ ...prev, dob: text }));
      return;
    }

    if (text.length === 2) {
      const day = parseInt(text);
      if (day < 1 || day > 31) {
        Alert.alert('Invalid Day', 'Please enter a day between 1 and 31');
        return;
      }
      text += '/';
      setDobPlaceholder('MM/YYYY');
    }
    
    if (text.length === 5) {
      const month = parseInt(text.split('/')[1]);
      if (month < 1 || month > 12) {
        Alert.alert('Invalid Month', 'Please enter a month between 01 and 12');
        return;
      }
      text += '/';
      setDobPlaceholder('YYYY');
    }

    if (text.length > 10) return;
    
    setFormData(prev => ({ ...prev, dob: text }));
  };

  const handleSignUp = () => {
    // Copy validation logic from SignUpScreen
    if (!formData.name || !formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    onSignUp(formData);
  };

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

      // Focus the name input as soon as animation starts
      nameInputRef.current?.focus();
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
              marginTop: -(height * 0.4),
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
                <Text style={styles.title}>Create Account</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeText}>×</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                ref={nameInputRef}
                style={styles.input}
                placeholder="Full Name"
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({...prev, name: text}))}
                placeholderTextColor="#999"
                returnKeyType="next"
                onSubmitEditing={() => emailInputRef.current?.focus()}
                blurOnSubmit={false}
              />

              <TextInput
                style={styles.input}
                placeholder={dobPlaceholder}
                value={formData.dob}
                onChangeText={(text) => validateDate(text)}
                keyboardType="numeric"
                maxLength={10}
                placeholderTextColor="#999"
                returnKeyType="next"
                onSubmitEditing={() => emailInputRef.current?.focus()}
                blurOnSubmit={false}
              />

              <TextInput
                ref={emailInputRef}
                style={styles.input}
                placeholder="Email"
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({...prev, email: text.trim()}))}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#999"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
              />

              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder="Password"
                value={formData.password}
                onChangeText={(text) => setFormData(prev => ({...prev, password: text}))}
                secureTextEntry
                placeholderTextColor="#999"
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
              />

              <TouchableOpacity 
                style={styles.button}
                onPress={handleSignUp}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Text>
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
    minHeight: height * 0.5,
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
    height: Platform.OS === 'ios' ? 50 : 56,
    width: '100%',
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
    letterSpacing: 0.5,
  }
});

export default SignUpDrawer;
