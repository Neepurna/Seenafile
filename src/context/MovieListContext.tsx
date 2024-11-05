import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TMDBMovie } from '../services/tmdb';

interface Movie extends TMDBMovie {
  // Add any additional properties specific to your app
}

interface MovieLists {
  seen: Movie[];
  watchLater: Movie[];
  mostWatch: Movie[];
}

interface MovieListContextType {
  movieLists: MovieLists;
  addMovieToList: (listId: keyof MovieLists, movie: Movie) => void;
}

const MovieListContext = createContext<MovieListContextType | undefined>(undefined);

const MovieListProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [movieLists, setMovieLists] = useState<MovieLists>({
    seen: [],
    watchLater: [],
    mostWatch: [],
  });

  // Load saved movies when component mounts
  useEffect(() => {
    const loadSavedMovies = async () => {
      try {
        const savedLists = await AsyncStorage.getItem('movieLists');
        if (savedLists) {
          const parsed = JSON.parse(savedLists);
          // Ensure all required lists exist
          setMovieLists({
            seen: parsed.seen || [],
            watchLater: parsed.watchLater || [],
            mostWatch: parsed.mostWatch || [],
          });
        }
      } catch (error) {
        console.error('Error loading saved movies:', error);
      }
    };
    loadSavedMovies();
  }, []);

  const addMovieToList = useCallback(async (listId: keyof MovieLists, movie: Movie) => {
    if (!movie) return; // Guard against undefined movie
    
    try {
      const updatedLists = {
        ...movieLists,
        [listId]: [...(movieLists[listId] || []), movie]
      };
      setMovieLists(updatedLists);
      await AsyncStorage.setItem('movieLists', JSON.stringify(updatedLists));
    } catch (error) {
      console.error('Error saving movie:', error);
    }
  }, [movieLists]);

  return (
    <MovieListContext.Provider value={{ movieLists, addMovieToList }}>
      {children}
    </MovieListContext.Provider>
  );
};

const useMovieLists = () => {
  const context = useContext(MovieListContext);
  if (!context) {
    throw new Error('useMovieLists must be used within a MovieListProvider');
  }
  return context;
};

export { 
  MovieListContext,
  MovieListProvider,
  useMovieLists 
};
