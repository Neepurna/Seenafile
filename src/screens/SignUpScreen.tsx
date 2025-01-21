// src/screens/SignUpScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createUserWithProfile } from '../firebase';

const SignUpScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    dob: new Date(),
    email: '',
    password: '',
    gender: 'not_specified', // Add this
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, dob: selectedDate }));
    }
  };

  const handleSignUp = async () => {
    try {
      if (!formData.name || !formData.email || !formData.password) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      setIsLoading(true);
      const { error, message } = await createUserWithProfile(formData);
      setIsLoading(false);

      if (error) {
        Alert.alert('Error', error);
        return;
      }

      Alert.alert(
        'Email Verification Required',
        'A verification email has been sent to your email address. Please verify your email before logging in.',
        [{ text: 'OK', onPress: () => navigation.replace('Main') }]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
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
            <View style={styles.contentWrapper}>
              <View style={styles.headerContainer}>
                <Text style={styles.headerText}>Create Account</Text>
                <Text style={styles.subHeaderText}>Join the community of movie lovers</Text>
              </View>

              <View style={styles.formContainer}>
                <TextInput
                  style={[styles.input, Platform.OS === 'android' && styles.androidInput]}
                  placeholder="Full Name"
                  placeholderTextColor="#999"
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({...prev, name: text}))}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  enablesReturnKeyAutomatically
                />

                <TouchableOpacity 
                  style={styles.input} 
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.inputText, !formData.dob && styles.placeholder]}>
                    {formData.dob.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={formData.dob}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}

                <TextInput
                  style={[styles.input, Platform.OS === 'android' && styles.androidInput]}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  value={formData.email}
                  onChangeText={(text) => setFormData(prev => ({...prev, email: text.trim()}))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  enablesReturnKeyAutomatically
                />

                <TextInput
                  style={[styles.input, Platform.OS === 'android' && styles.androidInput]}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={formData.password}
                  onChangeText={(text) => setFormData(prev => ({...prev, password: text}))}
                  secureTextEntry
                  returnKeyType="done"
                  blurOnSubmit={true}
                  enablesReturnKeyAutomatically
                />

                <TouchableOpacity 
                  style={[styles.button, styles.signUpButton]}
                  onPress={handleSignUp}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.loginLink}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.loginLinkText}>
                    Already have an account? Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
  headerText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 3,
  },
  subHeaderText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    letterSpacing: 1,
  },
  formContainer: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
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
    textAlignVertical: 'center',
  },
  androidInput: {
    paddingVertical: 8,
  },
  inputText: {
    color: '#FFF',
    fontSize: 16,
  },
  placeholder: {
    color: '#999',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 8,
  },
  signUpButton: {
    backgroundColor: '#FFF',
    marginTop: 20,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#999',
    fontSize: 14,
  }
});

export default SignUpScreen;