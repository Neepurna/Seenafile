export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Main: undefined;  // Changed from Tabs to Main
  MovieChat: {
    movieId: string;
    username: string;
  };
  UserProfileChat: {
    userId: string;
    username: string;
  };
  // ...other routes...
};

export type UserProfileChatScreenProps = {
  route: {
    params: {
      userId: string;
      username: string;
      chatId: string;
    };
  };
  navigation: any;
};

// Add this for type safety
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
