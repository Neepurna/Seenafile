export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Tabs: undefined;
  MovieGridScreen: {
    folderId: string;
    folderName: string;
    folderColor: string;
  };
  MovieChat: {
    chatId: string;
    userId: string;
    username: string;
  };
  UserProfileChat: {
    userId: string;
    username: string;
    chatId: string;
  };
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
