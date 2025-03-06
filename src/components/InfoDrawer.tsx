import React from 'react';
import { View } from 'react-native';

interface InfoDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// This is now a simplified version that doesn't actually display anything
// but prevents errors in components that still reference it
const InfoDrawer: React.FC<InfoDrawerProps> = ({
  isVisible,
  onClose,
  children
}) => {
  // Return an empty fragment - the component is effectively disabled
  return null;
};

export default InfoDrawer;