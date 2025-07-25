import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, FlatList, ActivityIndicator, Animated, Image, ImageBackground, Pressable, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { Audio } from 'expo-av';
import { useAuthorization } from '../utils/useAuthorization';
import { fetchUserLikes } from '../utils/fetchUserLikes';
import { collection, query, where, getDocs, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { likeSound } from '../utils/likeSound';
import { unlikeSound } from '../utils/unlikeSound';
import { SoundCard } from '../components/SoundCard';
import { BottomNavigation } from '../components/BottomNavigation';
import { UserPointsBadge } from '../components/UserPointsBadge';
import { UserBoltBadge } from '../components/UserBoltBadge';
import { useRoute, useFocusEffect } from '@react-navigation/native';

type SoundButton = {
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

type Category = {
  id: string;
  title: string;
  emoji: string;
};

export function FavoritesScreen({ navigation }: { navigation: any }) {
  // Audio & Playing State
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [buttonSound, setButtonSound] = useState<Audio.Sound | null>(null);
  const [buttonProgress, setButtonProgress] = useState(0);
  const [buttonDuration, setButtonDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loadingSoundIndex, setLoadingSoundIndex] = useState<number | null>(null);

  // Data State
  const [favoriteSounds, setFavoriteSounds] = useState<SoundButton[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [likeAnim, setLikeAnim] = useState<{[key: string]: Animated.Value}>({});
  const [loading, setLoading] = useState(true);

  // Bolts state
  const [boltsRemaining, setBoltsRemaining] = useState<number>(5);
  const hasBoltsRemaining = boltsRemaining > 0;

  // Navigation State
  const [selectedTab, setSelectedTab] = useState('Favorites');
  const [showRecordModal, setShowRecordModal] = useState(false);

  // Test audio source
  const testAudioSource = require('../../images/test.mp3');

  // User Auth
  const { selectedAccount } = useAuthorization();
  const isConnected = !!selectedAccount;
  const userWallet = selectedAccount?.publicKey.toBase58() || ''; // Use consistent format

  // Get current route name
  const route = useRoute();
  const currentRouteName = route.name;

  // Fetch user's favorite sounds
  const fetchFavoriteSounds = useCallback(async () => {
    if (!isConnected || !userWallet) {
      setFavoriteSounds([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get user's liked sound IDs
      const likedSoundIds = await fetchUserLikes(userWallet);
      setUserLikes(likedSoundIds);

      const likedSoundIdsArray = Array.from(likedSoundIds);
      if (likedSoundIdsArray.length === 0) {
        setFavoriteSounds([]);
        setLoading(false);
        return;
      }

      // Fetch the actual sound documents for liked sounds
      const soundsQuery = query(
        collection(db, 'sounds'),
        where('__name__', 'in', likedSoundIdsArray.slice(0, 10)) // Firestore 'in' limit
      );
      
      const querySnapshot = await getDocs(soundsQuery);
      const sounds = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as SoundButton[];

      // Sort by likes (highest first) - no featured sound here
      const sortedSounds = sounds.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      setFavoriteSounds(sortedSounds);
      
    } catch (error) {
      console.error('Error fetching favorite sounds:', error);
      setFavoriteSounds([]);
    } finally {
      setLoading(false);
    }
  }, [isConnected, userWallet]);

  // Fetch categories for emoji display
  const fetchCategories = useCallback(async () => {
    try {
      const categoriesQuery = query(collection(db, 'categories'));
      const querySnapshot = await getDocs(categoriesQuery);
      const fetchedCategories = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Track bolts remaining for today
  useEffect(() => {
    if (!selectedAccount) {
      setBoltsRemaining(5);
      return;
    }

    const userWallet = selectedAccount.publicKey.toBase58();
    const sanitizedWallet = userWallet.replace(/[\/\.#$\[\]]/g, '_');

    // Get start of today in UTC
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTodayTimestamp = Timestamp.fromDate(startOfToday);

    // Create real-time listener for today's likes
    const likesQuery = query(
      collection(db, 'likes'),
      where('userWallet', '==', sanitizedWallet),
      where('createdAt', '>=', startOfTodayTimestamp)
    );

    const unsubscribe = onSnapshot(likesQuery, 
      (querySnapshot) => {
        try {
          const todayLikesCount = querySnapshot.docs.length;
          const remaining = Math.max(0, 5 - todayLikesCount);
          setBoltsRemaining(remaining);
        } catch (error) {
          console.error('Error processing user bolts:', error);
          setBoltsRemaining(5);
        }
      }
    );

    return () => unsubscribe();
  }, [selectedAccount]);

  // Refetch favorites when screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchFavoriteSounds();
    }, [fetchFavoriteSounds])
  );

  // Handle play/pause
  const handlePlay = async (index: number, source: any) => {
    try {
      setLoadingSoundIndex(index);
      
      if (buttonSound) {
        await buttonSound.unloadAsync();
        setButtonSound(null);
      }

      if (playingIndex === index && sound) {
        if (isPaused) {
          await sound.playAsync();
          setIsPaused(false);
        } else {
          await sound.pauseAsync();
          setIsPaused(true);
        }
        setLoadingSoundIndex(null);
        return;
      }

      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      const { sound: newSound } = await Audio.Sound.createAsync(source, { shouldPlay: true });
      setButtonSound(newSound);
      setSound(newSound);
      setPlayingIndex(index);
      setIsPlaying(true);
      setIsPaused(false);
      setButtonProgress(0);

      newSound.setOnPlaybackStatusUpdate((playbackStatus: any) => {
        if (playbackStatus.isLoaded) {
          const progress = playbackStatus.durationMillis ? 
            playbackStatus.positionMillis / playbackStatus.durationMillis : 0;
          setButtonProgress(progress);
          setButtonDuration(playbackStatus.durationMillis || 0);

          if (playbackStatus.didJustFinish) {
            setTimeout(() => {
              setPlayingIndex(null);
              setButtonProgress(0);
              setButtonDuration(0);
              newSound.unloadAsync();
              setButtonSound(null);
              setSound(null);
              setIsPaused(false);
            }, 1000);
          }
        }
      });

      setTimeout(() => setLoadingSoundIndex(null), 500);
    } catch (error) {
      console.error('Error playing sound:', error);
      setLoadingSoundIndex(null);
    }
  };

  // Handle like/unlike
  const handleLike = async (soundId: string) => {
    if (!userWallet || !isConnected) return;
    
    const isLiked = userLikes.has(soundId);
    
    try {
      if (isLiked) {
        // Unlike (no bolt check needed)
        setUserLikes(prev => {
          const newSet = new Set(prev);
          newSet.delete(soundId);
          return newSet;
        });
        await unlikeSound(soundId, userWallet);
        
        // Remove from favorites list since it's no longer liked
        setFavoriteSounds(prev => prev.filter(sound => sound.id !== soundId));
      } else {
        // Like (check bolts first)
        if (!hasBoltsRemaining) {
          Alert.alert(
            'No Bolts Remaining!', 
            'You have used all your bolts for today. Come back tomorrow for more!',
            [{ text: 'OK' }]
          );
          return;
        }
        
        setUserLikes(prev => new Set(prev).add(soundId));
        await likeSound(soundId, userWallet);
      }
      
      // Animate like button
      const anim = likeAnim[soundId] || new Animated.Value(1);
      setLikeAnim(prev => ({ ...prev, [soundId]: anim }));
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.3, duration: 120, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 120, useNativeDriver: true })
      ]).start();
    } catch (error) {
      console.error('Error handling like/unlike:', error);
      Alert.alert('Error', String(error) || 'Failed to like/unlike sound');
      
      // Revert optimistic updates on error
      if (isLiked) {
        // If unlike failed, add back to likes
        setUserLikes(prev => new Set(prev).add(soundId));
      } else {
        // If like failed, remove from likes
        setUserLikes(prev => {
          const newSet = new Set(prev);
          newSet.delete(soundId);
          return newSet;
        });
      }
    }
  };

  const handleCreatePress = () => {
    setShowRecordModal(true);
  };

  // Not connected state
  if (!isConnected) {
    return (
      <View style={styles.container}>
        
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer}>
            {/* User Bolt Badge */}
            <UserBoltBadge />
          
          {/* Header with Logo */}
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
              {/* User Points Badge next to logo */}
              <UserPointsBadge />
            </View>
          </ImageBackground>

          {/* Not Connected Message */}
          <View style={styles.notConnectedContainer}>
            <Text style={styles.notConnectedTitle}>Connect Your Wallet</Text>
            <Text style={styles.notConnectedSubtitle}>
              Connect your wallet to see your favorite sounds
            </Text>
            <Pressable 
              style={styles.connectButton}
              onPress={() => navigation.navigate('Profile')} // Navigate to Profile screen
            >
              <Text style={styles.connectButtonText}>Go to Profile</Text>
            </Pressable>
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

  return (
    <View style={styles.container}>
      
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer}>
        {/* User Bolt Badge */}
        <UserBoltBadge />
        {/* User Points Badge */}
        <UserPointsBadge />
        
        {/* Header with Logo */}
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

        {/* Content Section */}
        <View style={styles.contentSection}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#EBB41C" />
              <Text style={styles.loadingText}>Loading your favorites...</Text>
            </View>
          ) : favoriteSounds.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Favorites Yet</Text>
              <Text style={styles.emptySubtitle}>
                Start liking sounds to see them here!
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Your Favorite Sounds ({favoriteSounds.length})</Text>
              <FlatList
                data={favoriteSounds}
                renderItem={({ item, index }) => {
                  const source = item.fileUrl ? { uri: item.fileUrl } : testAudioSource;
                  const isPlaying = playingIndex === index;
                  const isLiked = userLikes.has(item.id);
                  const categoryEmoji = categories.find(cat => cat.id === item.categoryId)?.emoji || '';
                  const anim = likeAnim[item.id] || new Animated.Value(1);

                  return (
                    <SoundCard
                      item={item}
                      index={index}
                      onPlay={handlePlay}
                      onLike={() => handleLike(item.id)}
                      isPlaying={isPlaying}
                      isPaused={isPaused}
                      buttonProgress={buttonProgress}
                      loadingSoundIndex={loadingSoundIndex}
                      isLiked={isLiked}
                      likeAnim={anim}
                      categoryEmoji={categoryEmoji}
                      source={source}
                      showRankCrown={false} // No crowns in favorites
                      isConnected={isConnected}
                      hasBoltsRemaining={hasBoltsRemaining}
                    />
                  );
                }}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.row}
                contentContainerStyle={styles.gridContainer}
                scrollEnabled={false}
              />
            </>
          )}
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
    paddingBottom: 80,
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
    paddingTop: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  gridContainer: {
    gap: 16,
    paddingBottom: 110,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
  },
  notConnectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  notConnectedTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  notConnectedSubtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 32,
  },
  connectButton: {
    backgroundColor: '#EBB41C',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 32,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  connectButtonText: {
    color: '#151515',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 