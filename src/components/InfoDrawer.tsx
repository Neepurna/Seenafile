import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.85;

interface InfoDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const InfoDrawer: React.FC<InfoDrawerProps> = ({
  isVisible,
  onClose,
  children
}) => {
  const drawerPosition = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [buttonActive, setButtonActive] = React.useState(false);

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(drawerPosition, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(drawerPosition, {
          toValue: -DRAWER_WIDTH,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isVisible]);

  const handleClose = () => {
    onClose();
  };

  return (
    <View style={[
      styles.container,
      { display: isVisible ? 'flex' : 'none' }
    ]}>
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: overlayOpacity }
        ]}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX: drawerPosition }]
          }
        ]}
      >
        <View style={styles.handle} />
        
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        <TouchableOpacity
          style={[
            styles.closeButton,
            buttonActive ? styles.closeButtonActive : styles.closeButtonInactive
          ]}
          onPress={handleClose}
          onPressIn={() => setButtonActive(true)}
          onPressOut={() => setButtonActive(false)}
        >
          <Ionicons 
            name="information-circle" 
            size={32} 
            color={buttonActive ? "#22ff22" : "#ff2222"} 
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 9999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: 'rgba(32, 32, 32, 0.97)',
    zIndex: 2,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  closeButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 10,
  },
  closeButtonActive: {
    backgroundColor: 'rgba(0, 50, 0, 0.9)',
    transform: [{ scale: 1.1 }],
  },
  closeButtonInactive: {
    backgroundColor: 'rgba(50, 0, 0, 0.9)',
  },
});

export default InfoDrawer;