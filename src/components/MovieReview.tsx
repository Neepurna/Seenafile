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
    title: string;
    // Include other movie properties if needed
  };
}

const MovieReview: React.FC<MovieReviewProps> = ({ movie }) => {
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
          value={review}
          onChangeText={setReview}
        />
      </View>

      {/* Add to List Feature */}
      <View style={styles.sectionRow}>
        <Text style={styles.label}>Add to List:</Text>
        <Switch value={addToList} onValueChange={setAddToList} />
      </View>

      {/* Submit Button */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    padding: 20,
    borderRadius: 15,
    backgroundColor: '#fff',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  star: {
    fontSize: 40,
    marginHorizontal: 5,
  },
  filledStar: {
    color: '#FFD700',
  },
  emptyStar: {
    color: '#C0C0C0',
  },
  textInput: {
    height: 100,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    textAlignVertical: 'top',
    backgroundColor: '#f9f9f9',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    borderRadius: 10,
    elevation: 2,
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default MovieReview;
