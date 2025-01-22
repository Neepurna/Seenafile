import { createStackNavigator } from '@react-navigation/stack';
import Tabs from './Tabs';
import MovieSearchScreen from '../screens/MovieSearchScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={Tabs} />
      <Stack.Screen 
        name="MovieSearch" 
        component={MovieSearchScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}

export default AppNavigator;
