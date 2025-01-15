// ...existing code...

async function saveSwipedMovie(movieId: string, movieTitle: string, category: string, currentUser: any) {
  if (!currentUser?.uid) {
    throw new Error('User must be authenticated to save movies');
  }

  const movieData = {
    movieId,
    movieTitle,
    category,
    createdAt: new Date().toISOString(),
    userId: currentUser.uid,
  };

  // Save to user's movies collection instead of global collection
  await firebase.firestore()
    .collection('users')
    .doc(currentUser.uid)
    .collection('movies')
    .doc(movieId)
    .set(movieData);

  // Also save to global collection
  await firebase.firestore()
    .collection('movies')
    .doc(movieId)
    .set(movieData);
}