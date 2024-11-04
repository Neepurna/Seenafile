// src/components/MovieReview.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TextInput,
  TouchableOpacity,
  Switch,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface MovieReviewProps {
  movie: {
    id: number;
    title: string;
    // Include other movie properties if needed
  };
  isFlipped: boolean;
}

const MovieReview: React.FC<MovieReviewProps> = ({ movie, isFlipped }) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [addToList, setAddToList] = useState(false);

  const handleRating = (newRating: number) => {
    setRating(newRating);
  };

  const handleSubmit = () => {
    // Handle the submit action
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{movie.title}</Text>

      {/* Rating Feature */}
      <View style={styles.section}>
        <Text style={styles.label}>Your Rating:</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => handleRating(star)}>
              <Text
                style={[
                  styles.star,
                  rating >= star ? styles.filledStar : styles.emptyStar,
                ]}
              >
                ★
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Review Feature */}
      <View style={styles.section}>
        <Text style={styles.label}>Your Review:</Text>
        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={4}
          placeholder="Write your review here..."
          placeholderTextColor="#888888"
          value={review}
          onChangeText={setReview}
          editable={isFlipped} // Disable when not flipped
          // Ensure autoFocus is not set
        />
      </View>

      {/* Add to List Feature */}
      <View style={styles.sectionRow}>
        <Text style={styles.label}>Add to List:</Text>
        <Switch value={addToList} onValueChange={setAddToList} disabled={!isFlipped} />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={!isFlipped}
      >
        <Text style={styles.submitButtonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 30,
    marginRight: 5,
  },
  filledStar: {
    color: '#FFD700',
  },
  emptyStar: {
    color: '#888888',
  },
  textInput: {
    borderColor: '#555555',
    borderWidth: 1,
    borderRadius: 10,
    color: '#ffffff',
    padding: 10,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F1F1F',
  },
});

export default MovieReview;
