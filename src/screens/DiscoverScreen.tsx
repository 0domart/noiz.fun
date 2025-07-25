import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, ActivityIndicator, Image, ImageBackground, Animated, PanResponder, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useAuthorization } from '../utils/useAuthorization';
import { likeSound } from '../utils/likeSound';
import { unlikeSound } from '../utils/unlikeSound';
import { fetchSounds } from '../utils/fetchSounds';
import { checkUserBolts } from '../utils/checkUserBolts';
import { fetchUserLikes } from '../utils/fetchUserLikes';
import { BottomNavigation } from '../components/BottomNavigation';
import { UserBoltBadge } from '../components/UserBoltBadge';
import { useRoute } from '@react-navigation/native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.15; // Reduced from 0.25 to 0.15 for easier swiping

// Define types
type SoundType = {
  id: string;
  title: string;
  color: string;
  fileUrl?: string;
  wallet?: string;
  likes?: number;
  createdAt?: any;
  creatorWallet?: string;
  categoryId?: string;
};

export function DiscoverScreen({ navigation }: { navigation: any }) {
  // User Auth
  const { selectedAccount } = useAuthorization();
  const isConnected = !!selectedAccount;
  const userWallet = selectedAccount?.publicKey.toBase58() || '';

  // Navigation State
  const route = useRoute();
  const currentRouteName = route.name;
  const [selectedTab, setSelectedTab] = useState('Discover');

  // Core state
  const [sounds, setSounds] = useState<SoundType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [boltsRemaining, setBoltsRemaining] = useState<number>(5);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  
  // Playback progress state
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

  // Animation refs
  const pan = useRef(new Animated.ValueXY()).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const soundsRef = useRef<SoundType[]>([]);
  const currentIndexRef = useRef(0);

  // Fetch sounds on mount
  useEffect(() => {
    async function loadSounds() {
      try {
        setLoading(true);
        const recentSounds = await fetchSounds();
        console.log('Loaded sounds:', recentSounds.length);
        const typedSounds = recentSounds as SoundType[];
        setSounds(typedSounds);
        soundsRef.current = typedSounds;
      } catch (error) {
        console.error('Error fetching sounds:', error);
        Alert.alert('Error', 'Failed to load sounds');
      } finally {
        setLoading(false);
      }
    }
    loadSounds();
  }, []);

  // Check bolts and fetch user likes when user connects
  useEffect(() => {
    async function updateUserData() {
      if (isConnected && userWallet) {
        try {
          // Fetch bolts and likes in parallel
          const [boltsResult, likesSet] = await Promise.all([
            checkUserBolts(userWallet),
            fetchUserLikes(userWallet)
          ]);
          
          setBoltsRemaining(boltsResult.boltsRemaining);
          setUserLikes(likesSet);
        } catch (error) {
          console.error('Error checking user data:', error);
        }
      } else {
        // Reset when disconnected
        setBoltsRemaining(5);
        setUserLikes(new Set());
      }
    }
    updateUserData();
  }, [isConnected, userWallet]);

  // Update ref when currentIndex state changes
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Update soundsRef when sounds state changes
  useEffect(() => {
    soundsRef.current = sounds;
  }, [sounds]);

  // Auto-play current sound
  useEffect(() => {
    if (currentIndex >= sounds.length || !sounds[currentIndex]) return;

    const playCurrentSound = async () => {
      try {
        // Stop and cleanup previous sound
        if (currentSound) {
          try {
            await currentSound.stopAsync();
            await currentSound.unloadAsync();
          } catch (cleanupError) {
            console.log('Error cleaning up previous sound:', cleanupError);
          }
          setCurrentSound(null);
          setPlaybackProgress(0);
          setPlaybackDuration(0);
          setIsPlaying(false);
        }

        const soundToPlay = sounds[currentIndex];
        console.log('Playing sound at index:', currentIndex, soundToPlay.title);
        
        if (soundToPlay.fileUrl) {
          const { sound, status } = await Audio.Sound.createAsync(
            { uri: soundToPlay.fileUrl },
            { shouldPlay: false } // Don't auto-play immediately
          );
          
          // Check if sound loaded successfully
          if (!status.isLoaded) {
            console.error('Sound failed to load');
            return;
          }
          
          setCurrentSound(sound);
          setPlaybackProgress(0);
          setPlaybackDuration(status.durationMillis || 0);
          
          sound.setOnPlaybackStatusUpdate((playbackStatus) => {
            if (!playbackStatus.isLoaded) return;
            
            // Update playing state based on actual playback status
            setIsPlaying(playbackStatus.isPlaying);
            
            if (playbackStatus.isPlaying && playbackStatus.durationMillis) {
              setPlaybackProgress(playbackStatus.positionMillis / playbackStatus.durationMillis);
            }
            
            if (playbackStatus.didJustFinish) {
              // Add 1-second visual delay to show completed progress
              setTimeout(() => {
                setPlaybackProgress(0);
                setPlaybackDuration(0);
                setIsPlaying(false);
              }, 1000);
            }
          });
          
          // Play the sound after setting up callbacks
          await sound.playAsync();
        }
      } catch (error) {
        console.error('Error playing sound:', error);
        setIsPlaying(false);
      }
    };

    playCurrentSound();
  }, [currentIndex, sounds]);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (currentSound) {
        currentSound.unloadAsync().catch((error) => {
          console.log('Error unloading sound on cleanup:', error);
        });
      }
      setPlaybackProgress(0);
      setPlaybackDuration(0);
      setIsPlaying(false);
    };
  }, [currentSound]);

  // Handle pause/play toggle
  const togglePlayback = async () => {
    if (!currentSound) return;
    
    try {
      // Check if sound is loaded before trying to play/pause
      const status = await currentSound.getStatusAsync();
      if (!status.isLoaded) {
        console.error('Cannot toggle playback: sound not loaded');
        return;
      }
      
      if (isPlaying) {
        await currentSound.pauseAsync();
        // Don't manually set isPlaying - let the status callback handle it
      } else {
        await currentSound.playAsync();
        // Don't manually set isPlaying - let the status callback handle it
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  // Move to next card
  const nextCard = () => {
    if (isTransitioning) {
      console.log('Already transitioning, ignoring');
      return;
    }
    
    const currentSounds = soundsRef.current;
    if (currentSounds.length === 0) {
      console.log('No sounds available, cannot move to next card');
      return;
    }
    
    const currentIdx = currentIndexRef.current;
    console.log('Moving to next card, current index:', currentIdx, 'total sounds:', currentSounds.length);
    setIsTransitioning(true);
    
    // Reset animations and playback progress
    pan.setValue({ x: 0, y: 0 });
    rotation.setValue(0);
    setPlaybackProgress(0);
    setPlaybackDuration(0);
    
    // Calculate next index using ref value
    const nextIndex = currentIdx + 1;
    console.log('Previous index:', currentIdx, 'Next index will be:', nextIndex, 'sounds length:', currentSounds.length);
    
    let newIndex;
    if (nextIndex >= currentSounds.length) {
      console.log('Reached end, looping back to start');
      newIndex = 0;
    } else {
      console.log('Moving to index:', nextIndex);
      newIndex = nextIndex;
    }
    
    // Update both state and ref
    currentIndexRef.current = newIndex;
    setCurrentIndex(newIndex);
    
    // Allow next transition after a short delay
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  // Handle like/unlike
  const handleLike = async () => {
    if (!isConnected) {
      Alert.alert('Connect Wallet', 'Please connect your wallet to like/unlike sounds.');
      nextCard(); // Still move to next card even if not connected
      return;
    }

    const currentIdx = currentIndexRef.current;
    const currentSounds = soundsRef.current; // Use ref instead of state to avoid closure issues
    
    const currentSoundData = currentSounds[currentIdx]; // Use ref array instead
    
    if (!currentSoundData) {
      nextCard();
      return;
    }

    const isAlreadyLiked = userLikes.has(currentSoundData.id);
    const action = isAlreadyLiked ? 'unlike' : 'like';
    
    // Check bolts only for liking (not for unliking)
    if (!isAlreadyLiked && boltsRemaining <= 0) {
      Alert.alert('Out of Bolts', 'You have used all your bolts for today! Come back tomorrow for more.');
      nextCard(); // Still move to next card even if no bolts
      return;
    }

    try {
      console.log(`🎵 Attempting to ${action} sound:`, currentSoundData.title, 'ID:', currentSoundData.id);
      
      if (isAlreadyLiked) {
        // Unlike the sound (gives bolt back)
        await unlikeSound(currentSoundData.id, userWallet);
        console.log('✅ Sound unliked successfully!');
        
        // Update local state
        setUserLikes(prev => {
          const newLikes = new Set(prev);
          newLikes.delete(currentSoundData.id);
          return newLikes;
        });
        
        // Update bolt count (add back 1 bolt)
        setBoltsRemaining(prev => prev + 1);
        
        // Update likes count locally
        setSounds(prev => {
          const updated = prev.map((sound, index) => 
            index === currentIdx 
              ? { ...sound, likes: Math.max(0, (sound.likes || 0) - 1) }
              : sound
          );
          soundsRef.current = updated;
          return updated;
        });
        
      } else {
        // Like the sound (uses bolt)
        await likeSound(currentSoundData.id, userWallet);
        console.log('✅ Sound liked successfully!');
        
        // Update local state
        setUserLikes(prev => new Set([...prev, currentSoundData.id]));
        
        // Refresh bolt count from database
        try {
          const boltsResult = await checkUserBolts(userWallet);
          setBoltsRemaining(boltsResult.boltsRemaining);
        } catch (refreshError) {
          setBoltsRemaining(prev => prev - 1);
        }
        
        // Update likes count locally
        setSounds(prev => {
          const updated = prev.map((sound, index) => 
            index === currentIdx 
              ? { ...sound, likes: (sound.likes || 0) + 1 }
              : sound
          );
          soundsRef.current = updated;
          return updated;
        });
      }
      
      console.log(`🎉 Sound ${action}d successfully, moving to next card`);
      nextCard();
    } catch (error) {
      console.error(`❌ Error ${action}ing sound:`, error);
      Alert.alert('❌ Error', `Failed to ${action} sound: ${String(error)}`);
      nextCard(); // Still move to next card even if operation failed
    }
  };

  // Handle skip
  const handleSkip = () => {
    nextCard();
  };

  // Swipe gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only start pan if it's a horizontal swipe with sufficient movement
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        // Don't set offset, just start from current position
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        
        // Rotate based on horizontal movement
        const rotationValue = gestureState.dx / screenWidth * 30; // Max 30 degrees
        rotation.setValue(rotationValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        console.log('🔄 Pan released - dx:', gestureState.dx, 'threshold:', SWIPE_THRESHOLD, 'transitioning:', isTransitioning);
        
        if (isTransitioning) {
          console.log('⏸️ Ignoring gesture - already transitioning');
          return; // Don't handle gestures while transitioning
        }
        
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe right - like
          console.log('👉 RIGHT SWIPE DETECTED! Calling handleLike()');
          Animated.timing(pan, {
            toValue: { x: screenWidth + 100, y: gestureState.dy },
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            console.log('✅ Right swipe animation completed, calling handleLike()');
            handleLike();
          });
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe left - skip
          console.log('👈 LEFT SWIPE DETECTED! Calling nextCard()');
          Animated.timing(pan, {
            toValue: { x: -screenWidth - 100, y: gestureState.dy },
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            console.log('✅ Left swipe animation completed, calling nextCard()');
            nextCard();
          });
        } else {
          // Snap back to center
          console.log('🔄 Swipe not strong enough, snapping back to center');
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
          
          Animated.spring(rotation, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Handle create button press from bottom nav
  const handleCreatePress = () => {
    navigation.navigate('CreateSound');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#EBB41C" />
        <Text style={styles.loadingText}>Loading sounds...</Text>
      </View>
    );
  }

  if (sounds.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>No sounds available</Text>
      </View>
    );
  }

  const currentSoundData = sounds[currentIndex];
  if (!currentSoundData) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>No more sounds</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* User Bolt Badge */}
      <UserBoltBadge />
      
      {/* Cloud Background with Logo */}
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

      {/* Main Content */}
      <View style={styles.mainContent}>


        {/* Card Stack - Show 3 cards with the current one on top */}
        <View style={styles.cardStack}>
          {/* Background Cards */}
          {sounds.slice(currentIndex, currentIndex + 3).map((sound, index) => {
            if (index === 0) return null; // Don't render the current card here
            
            return (
              <View
                key={`${sound.id}-${currentIndex}-${index}`}
                style={[
                  styles.cardContainer,
                  styles.backgroundCard,
                  {
                    zIndex: 3 - index,
                    transform: [
                      { scale: 1 - (index * 0.05) }, // Slightly smaller
                      { translateY: index * 5 }, // Slightly offset
                    ],
                    opacity: 1 - (index * 0.3), // More transparent
                  }
                ]}
              >
                <View style={[styles.soundCard, { backgroundColor: sound.color || '#6a89cc' }]}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.soundTitle}>{sound.title}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Current Card (Top) */}
          <Animated.View 
            style={[
              styles.cardContainer,
              styles.topCard,
              {
                zIndex: 10,
                transform: [
                  { translateX: pan.x },
                  { translateY: pan.y },
                  { rotate: rotation.interpolate({
                    inputRange: [-30, 0, 30],
                    outputRange: ['-30deg', '0deg', '30deg'],
                  }) },
                  { scale: pan.x.interpolate({
                    inputRange: [-screenWidth, 0, screenWidth],
                    outputRange: [0.95, 1, 0.95],
                    extrapolate: 'clamp',
                  }) },
                ],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <View style={[styles.soundCard, { backgroundColor: currentSoundData.color || '#6a89cc' }]}>
              {/* Progress Background Overlay */}
              <View style={styles.progressBackgroundContainer}>
                <View style={[
                  styles.progressFill, 
                  { 
                    transform: [{ scaleX: playbackProgress }],
                    transformOrigin: 'left',
                    borderTopLeftRadius: 20,
                    borderBottomLeftRadius: 20,
                    borderTopRightRadius: playbackProgress >= 0.98 ? 20 : 0,
                    borderBottomRightRadius: playbackProgress >= 0.98 ? 20 : 0,
                  }
                ]} />
              </View>

              {/* Play Button (Top Left) */}
              <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
                <MaterialIcons 
                  name={isPlaying ? 'pause' : 'play-arrow'} 
                  size={32} 
                  color="#fff" 
                />
              </TouchableOpacity>

              {/* Title (Bottom Center) */}
              <View style={styles.titleContainer}>
                <Text style={styles.soundTitle}>{currentSoundData.title}</Text>
              </View>

              {/* Swipe Indicators */}
              <Animated.View 
                style={[
                  styles.swipeIndicator,
                  styles.swipeLeft,
                  {
                    opacity: pan.x.interpolate({
                      inputRange: [-150, -50, 0],
                      outputRange: [1, 0.5, 0],
                      extrapolate: 'clamp',
                    }),
                  }
                ]}
              >
                <MaterialIcons name="close" size={48} color="#ff5a5f" />
                <Text style={styles.swipeText}>SKIP</Text>
              </Animated.View>

              <Animated.View 
                style={[
                  styles.swipeIndicator,
                  styles.swipeRight,
                  {
                    opacity: pan.x.interpolate({
                      inputRange: [0, 50, 150],
                      outputRange: [0, 0.5, 1],
                      extrapolate: 'clamp',
                    }),
                  }
                ]}
              >
                <MaterialIcons name="favorite" size={48} color="#4CAF50" />
                <Text style={styles.swipeText}>LIKE</Text>
              </Animated.View>
            </View>
          </Animated.View>
        </View>


      </View>

      {/* Bottom Navigation */}
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cloudBackground: {
    width: '100%',
    height: 240, // Match HomeScreen height
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
    width: 168, // Match HomeScreen size
    height: 168, // Match HomeScreen size
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120, // Space for bottom nav
  },

  cardStack: {
    position: 'relative',
    width: screenWidth * 0.85,
    height: screenHeight * 0.48, // Reduced height
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundCard: {
    // Styles for background cards in the stack
  },
  topCard: {
    // Styles for the top card
  },
  soundCard: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    position: 'relative',
  },
  playButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },

  titleContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  soundTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  swipeIndicator: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    top: '50%',
    transform: [{ translateY: -40 }],
  },
  swipeLeft: {
    left: 30,
  },
  swipeRight: {
    right: 30,
  },
  swipeText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#333',
  },
  progressBackgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20, // Match card border radius
    overflow: 'hidden', // Ensure fill respects border radius
    zIndex: 0, // Behind content but above card background
  },
  progressFill: {
    height: '100%',
    width: '100%', // Full width for scaleX transform to work from
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Semi-transparent white overlay
    // Border radius now applied dynamically based on progress
  },

  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
}); 