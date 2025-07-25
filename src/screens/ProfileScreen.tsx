import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Image, ImageBackground, Animated } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthorization } from '../utils/useAuthorization';
import { useMobileWallet } from '../utils/useMobileWallet';
import { SignInFeature } from '../components/sign-in/sign-in-feature';
import { BottomNavigation } from '../components/BottomNavigation';
import { UserPointsBadge } from '../components/UserPointsBadge';
import { UserBoltBadge } from '../components/UserBoltBadge';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { ellipsify } from '../utils/ellipsify';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';

export function ProfileScreen({ navigation }: { navigation: any }) {
  const { selectedAccount } = useAuthorization();
  const { disconnect } = useMobileWallet();
  const isConnected = !!selectedAccount;
  
  // Navigation state
  const [selectedTab, setSelectedTab] = useState('Profile');
  const [showRecordModal, setShowRecordModal] = useState(false);

  // KPI state with better loading management
  const [userStats, setUserStats] = useState({
    soundsCreated: 0,
    likesReceived: 0,
    userSinceDays: 0,
    loading: true,
    hasData: false // Track if we've loaded data before
  });

  // Animation values for smooth loading
  const shimmerAnim = useState(new Animated.Value(0))[0];
  const fadeAnim1 = useState(new Animated.Value(0))[0];
  const fadeAnim2 = useState(new Animated.Value(0))[0];
  const fadeAnim3 = useState(new Animated.Value(0))[0];

  // Shimmer animation for skeleton loading
  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    if (userStats.loading) {
      shimmerAnimation.start();
    } else {
      shimmerAnimation.stop();
      // Staggered fade-in for polished reveal effect
      Animated.timing(fadeAnim1, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
      setTimeout(() => {
        Animated.timing(fadeAnim2, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 150);
      
      setTimeout(() => {
        Animated.timing(fadeAnim3, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 300);
    }
    
    return () => shimmerAnimation.stop();
  }, [userStats.loading, shimmerAnim, fadeAnim1, fadeAnim2, fadeAnim3]);

  // Get current route name
  const route = useRoute();
  const currentRouteName = route.name;

  const handleCreatePress = () => {
    setShowRecordModal(true);
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  // Fetch user statistics when connected
  useFocusEffect(
    useCallback(() => {
      const fetchUserStats = async () => {
        if (!isConnected || !selectedAccount) {
          setUserStats({ soundsCreated: 0, likesReceived: 0, userSinceDays: 0, loading: false, hasData: false });
          return;
        }

        try {
          setUserStats(prev => ({ ...prev, loading: true }));
          // Reset fade animation for fresh start
          fadeAnim1.setValue(0);
          fadeAnim2.setValue(0);
          fadeAnim3.setValue(0);
          
          const userWallet = selectedAccount.publicKey.toBase58(); // Use same format as sound creation
          const sanitizedWallet = userWallet.replace(/[\/\.#$\[\]]/g, '_');

          console.log('ProfileScreen: Fetching stats for wallet:', userWallet);
          console.log('ProfileScreen: Sanitized wallet:', sanitizedWallet);

          // Fetch sounds created by user
          const soundsQuery = query(
            collection(db, 'sounds'),
            where('creatorWallet', '==', sanitizedWallet),
            orderBy('createdAt', 'desc')
          );
          const soundsSnapshot = await getDocs(soundsQuery);
          const userSounds = soundsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
          
          console.log('ProfileScreen: Found sounds:', userSounds.length);
          console.log('ProfileScreen: Sounds data:', userSounds);

          // Calculate total likes received
          const totalLikes = userSounds.reduce((sum, sound) => sum + (sound.likes || 0), 0);
          
          console.log('ProfileScreen: Total likes:', totalLikes);

          // Calculate user since days (using first sound creation date)
          let userSinceDays = 0;
          if (userSounds.length > 0) {
            const firstSoundDate = userSounds[userSounds.length - 1].createdAt?.toDate();
            if (firstSoundDate) {
              const daysDiff = Math.floor((new Date().getTime() - firstSoundDate.getTime()) / (1000 * 3600 * 24));
              userSinceDays = Math.max(1, daysDiff); // At least 1 day
            }
          }

          setUserStats({
            soundsCreated: userSounds.length,
            likesReceived: totalLikes,
            userSinceDays,
            loading: false,
            hasData: true
          });
        } catch (error) {
          console.error('Error fetching user stats:', error);
          setUserStats({ soundsCreated: 0, likesReceived: 0, userSinceDays: 0, loading: false, hasData: false });
        }
      };

      fetchUserStats();
    }, [isConnected, selectedAccount])
  );

  return (
    <View style={styles.container}>
      {/* User Bolt Badge */}
      <UserBoltBadge />
      
      {/* User Points Badge */}
      <UserPointsBadge />
      
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer}>
        {/* Header with Cloud Background and Logo */}
        <ImageBackground
          source={require('../../assets/noiz_cloud.png')}
          style={styles.cloudBackground}
          resizeMode="cover"
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/noiz_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </ImageBackground>

        {/* Profile Content */}
        <View style={styles.contentSection}>
          {/* Wallet Connection Section */}
          <View style={styles.walletSection}>
            {!isConnected ? (
              <>
                <Text style={styles.sectionTitle}>Connect Your Wallet</Text>
                <Text style={styles.sectionSubtitle}>
                  Connect your Solana wallet to create sounds, like, and participate in Noiz.fun
                </Text>
                
                <SignInFeature />
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Wallet Connected</Text>
                
                {/* Connected Wallet Info */}
                <View style={styles.walletInfo}>
                  <View style={styles.walletAddressContainer}>
                    <MaterialIcons name="wallet" size={24} color="#EBB41C" />
                    <View style={styles.walletAddressText}>
                      <Text style={styles.walletLabel}>Wallet Address</Text>
                      <Text style={styles.walletAddress}>
                        {ellipsify(selectedAccount.publicKey.toBase58(), 8)}
                      </Text>
                    </View>
                  </View>

                  {/* User Statistics */}
                  <View style={styles.statsContainer}>
                    <Text style={styles.statsTitle}>Your Statistics</Text>
                    
                    <View style={styles.statsGrid}>
                      <View style={styles.statItem}>
                        <MaterialIcons name="music-note" size={24} color="#EBB41C" />
                        {userStats.loading ? (
                          <Animated.View style={[styles.skeletonValue, { opacity: shimmerAnim }]} />
                        ) : (
                          <Animated.Text style={[styles.statValue, { opacity: fadeAnim1 }]}>
                            {userStats.soundsCreated}
                          </Animated.Text>
                        )}
                        <Text style={styles.statLabel}>Sounds Created</Text>
                      </View>
                      
                      <View style={styles.statItem}>
                        <MaterialIcons name="favorite" size={24} color="#D74A35" />
                        {userStats.loading ? (
                          <Animated.View style={[styles.skeletonValue, { opacity: shimmerAnim }]} />
                        ) : (
                          <Animated.Text style={[styles.statValue, { opacity: fadeAnim2 }]}>
                            {userStats.likesReceived}
                          </Animated.Text>
                        )}
                        <Text style={styles.statLabel}>Likes Received</Text>
                      </View>
                      
                      <View style={styles.statItem}>
                        <MaterialIcons name="calendar-today" size={24} color="#3896AB" />
                        {userStats.loading ? (
                          <Animated.View style={[styles.skeletonValue, { opacity: shimmerAnim }]} />
                        ) : (
                          <Animated.Text style={[styles.statValue, { opacity: fadeAnim3 }]}>
                            {userStats.userSinceDays}
                          </Animated.Text>
                        )}
                        <Text style={styles.statLabel}>Days Active</Text>
                      </View>
                    </View>
                  </View>
                  
                  <Button
                    mode="outlined"
                    onPress={handleDisconnect}
                    style={styles.disconnectButton}
                    labelStyle={styles.disconnectButtonText}
                    icon="logout"
                  >
                    Disconnect
                  </Button>
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <BottomNavigation
        selectedTab={currentRouteName}
        onTabChange={setSelectedTab}
        onCreatePress={handleCreatePress}
        navigation={navigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3896AB',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 80, // Space for bottom navigation
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  cloudBackground: {
    width: '100%',
    height: 240,
    paddingTop: 0,
    paddingBottom: 0,
  },
  logoContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 8,
  },
  logo: {
    width: 168,
    height: 168,
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 0, // Reduced from 8 to move content higher
  },
  walletSection: {
    backgroundColor: '#2B6B79',
    borderRadius: 18,
    padding: 20,
    marginTop: 24, // Added to move card lower
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 20,
    lineHeight: 20,
  },
  walletInfo: {
    marginBottom: 20,
  },
  walletAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151515',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  walletAddressText: {
    marginLeft: 12,
    flex: 1,
  },
  walletLabel: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  walletAddress: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  disconnectButton: {
    borderColor: '#D74A35',
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: '#000000', // Black background
  },
  disconnectButtonText: {
    color: '#D74A35',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 8,
  },
  statValue: {
    color: '#EBB41C',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
  skeletonValue: {
    width: 48,
    height: 28,
    backgroundColor: '#333333',
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 2,
    position: 'relative',
    overflow: 'hidden',
  },
}); 