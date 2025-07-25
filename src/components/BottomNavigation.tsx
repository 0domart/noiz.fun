import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

interface BottomNavigationProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  onCreatePress: () => void;
  navigation?: any; // Add navigation prop
}

export function BottomNavigation({ selectedTab, onTabChange, onCreatePress, navigation }: BottomNavigationProps) {
  const handleTabPress = (tabName: string, screenName?: string) => {
    if (navigation && screenName) {
      navigation.navigate(screenName);
    } else {
      onTabChange(tabName);
    }
  };

  const handleCreatePress = () => {
    if (navigation) {
      navigation.navigate('CreateSound');
    } else {
      onCreatePress();
    }
  };

  return (
    <View style={styles.bottomNavContainer}>
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleTabPress('Home', 'Home')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconContainer, selectedTab === 'Home' && styles.iconContainerSelected]}>
            <MaterialIcons 
              name="nightlight" 
              size={24} 
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, styles.navItemBeforeCenter]}
          onPress={() => handleTabPress('Discover', 'Discover')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconContainer, selectedTab === 'Discover' && styles.iconContainerSelected]}>
            <MaterialIcons 
              name="home" 
              size={24} 
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.navText}>Discover</Text>
        </TouchableOpacity>

        {/* Empty space for center button */}
        <View style={styles.centerSpacer} />

        <TouchableOpacity
          style={[styles.navItem, styles.navItemAfterCenter]}
          onPress={() => handleTabPress('Favorites', 'Favorites')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconContainer, selectedTab === 'Favorites' && styles.iconContainerSelected]}>
            <MaterialIcons 
              name="music-note" 
              size={24} 
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.navText}>Favorites</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleTabPress('Profile', 'Profile')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconContainer, selectedTab === 'Profile' && styles.iconContainerSelected]}>
            <MaterialIcons 
              name="person" 
              size={24} 
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Create Button - Absolutely positioned center button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreatePress}
        activeOpacity={0.8} // Good press feedback
        delayPressIn={0} // Immediate response
        delayPressOut={100} // Slightly longer for better feel
      >
        <Image 
          source={require('../../assets/button_create.png')} 
          style={styles.boltIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Bottom Navigation
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomNav: {
    backgroundColor: '#151515', // Black background
    height: 90, // Updated height
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 6, // Space between icon and text
  },
  navItemBeforeCenter: {
    marginRight: 10, // Space before the center button
  },
  navItemAfterCenter: {
    marginLeft: 10, // Space after the center button
  },
  iconContainer: {
    height: 44, // Fixed height for all icon containers
    width: 44, // Fixed width for consistent sizing
    justifyContent: 'center',
    alignItems: 'center',
    // No background styling for unselected tabs
  },
  iconContainerSelected: {
    height: 44, // Same fixed height
    width: 44, // Same fixed width
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EBB41C', // Yellow background for selected
    borderRadius: 16, // Rounded corners
    // Removed padding since we're using fixed dimensions
  },
  navText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  centerSpacer: {
    flex: 1, // Takes space for the center button
  },
  createButton: {
    backgroundColor: '#D74A35', // Red background
    borderRadius: 18, // Rounded corners
    borderWidth: 6, // Black border
    borderColor: '#151515', // Same black as navbar
    width: 92, // Bigger button
    height: 90, // Bigger button
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: '50%',
    marginLeft: -45, // Half of width (90/2) to center
    top: -15, // Position it lower, more aligned with navbar
    // Enhanced shadow effects
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    // Additional shadow for more depth
    borderTopColor: '#151515',
    borderBottomColor: '#000000', // Darker bottom for depth
    borderLeftColor: '#151515',
    borderRightColor: '#151515',
  },
  boltIcon: {
    width: 85, // Bigger icon to match larger button
    height: 85, // Bigger icon to match larger button
    // Icon shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
}); 