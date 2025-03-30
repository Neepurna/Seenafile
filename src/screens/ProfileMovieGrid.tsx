import React from 'react';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import MovieGridScreen from './MovieGridScreen';

type ProfileMovieGridProps = {
  route: RouteProp<any, any>;
  navigation: NavigationProp<any>;
};

const ProfileMovieGrid: React.FC<ProfileMovieGridProps> = ({ route, navigation }) => {
  return <MovieGridScreen route={route} navigation={navigation} />;
};

export default ProfileMovieGrid;
