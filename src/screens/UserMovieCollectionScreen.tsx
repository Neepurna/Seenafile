import React from 'react';
import MovieGridScreen from './MovieGridScreen';

// Extend MovieGridScreen for user-specific movie collections
const UserMovieCollectionScreen = (props) => {
  return <MovieGridScreen {...props} />;
};

export default UserMovieCollectionScreen;
