import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { HomeScreen } from "../screens/HomeScreen";
import { FavoritesScreen } from "../screens/FavoritesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { CreateSoundScreen } from "../screens/CreateSoundScreen";
import { DiscoverScreen } from "../screens/DiscoverScreen";
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";
import { useTheme } from "react-native-paper";
import BlankScreen from "../screens/BlankScreen";

const Tab = createBottomTabNavigator();

/**
 * This is the main navigator with a bottom tab bar.
 * Each tab is a stack navigator with its own set of screens.
 *
 * More info: https://reactnavigation.org/docs/bottom-tab-navigator/
 */
export function HomeNavigator() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, // Remove top bar completely
        tabBarStyle: { display: 'none' },
        tabBarIcon: ({ focused, color, size }) => {
          switch (route.name) {
            case "Home":
              return (
                <MaterialCommunityIcon
                  name={focused ? "home" : "home-outline"}
                  size={size}
                  color={color}
                />
              );
            case "Discover":
              return (
                <MaterialCommunityIcon
                  name={focused ? "compass" : "compass-outline"}
                  size={size}
                  color={color}
                />
              );
            case "Favorites":
              return (
                <MaterialCommunityIcon
                  name={focused ? "heart" : "heart-outline"}
                  size={size}
                  color={color}
                />
              );
            case "Profile":
              return (
                <MaterialCommunityIcon
                  name={focused ? "account" : "account-outline"}
                  size={size}
                  color={color}
                />
              );
            case "CreateSound":
              return (
                <MaterialCommunityIcon
                  name={focused ? "microphone" : "microphone-outline"}
                  size={size}
                  color={color}
                />
              );
            case "Blank":
              return (
                <MaterialCommunityIcon
                  name={
                    focused ? "application-edit" : "application-edit-outline"
                  }
                  size={size}
                  color={color}
                />
              );
          }
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
      />
      <Tab.Screen
        name="CreateSound"
        component={CreateSoundScreen}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Blank" component={BlankScreen} />
    </Tab.Navigator>
  );
}
