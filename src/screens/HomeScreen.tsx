import React from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, FlatList, Modal, TextInput, Pressable, Button, Alert, ActivityIndicator, Animated, Dimensions, TouchableWithoutFeedback, Image, ImageBackground } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import { useAuthorization } from '../utils/useAuthorization';
import { uploadAudioToFirebase } from '../utils/uploadAudioToFirebase';
import { useMobileWallet } from '../utils/useMobileWallet';
import { saveSoundMetadata } from '../utils/saveSoundMetadata';
import { fetchSounds } from '../utils/fetchSounds';
import { collection, query, orderBy, onSnapshot, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { likeSound } from '../utils/likeSound';
import { unlikeSound } from '../utils/unlikeSound';
import { fetchUserLikes } from '../utils/fetchUserLikes';
import * as solanaWeb3 from '@solana/web3.js';
import { useAnchorWallet } from "../utils/useAnchorWallet";
import { BottomNavigation } from '../components/BottomNavigation';
import { useRoute } from '@react-navigation/native';
import { SoundCard } from '../components/SoundCard';
import { UserPointsBadge } from '../components/UserPointsBadge';
import { UserBoltBadge } from '../components/UserBoltBadge';

const testAudioSource = require('../../images/test.mp3');

// Define the type for a sound button
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

// Add type for Category
interface Category {
  id: string;
  title: string;
  emoji: string;
}

export function HomeScreen({ navigation }: { navigation: any }) {
  const { signAndSendTransaction, signIn, connect } = useMobileWallet();
  // Data states  
  const [soundButtons, setSoundButtons] = React.useState<SoundButton[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [likes, setLikes] = useState<{[key: string]: number}>({});
  const [liked, setLiked] = useState<{[key: string]: boolean}>({});
  const [likeAnim, setLikeAnim] = useState<{[key: string]: Animated.Value}>({});

  // Loading states
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSounds, setLoadingSounds] = useState(true);

  // Bolts state
  const [boltsRemaining, setBoltsRemaining] = useState<number>(5);
  const hasBoltsRemaining = boltsRemaining > 0;

  // Shimmer animation for skeletons
  const shimmerAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
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
    shimmerAnimation.start();
    
    return () => shimmerAnimation.stop();
  }, [shimmerAnim]);

  // Navigation state
  const [selectedTab, setSelectedTab] = useState('Home');

  // User Auth
  const { selectedAccount } = useAuthorization();
  const isConnected = !!selectedAccount;
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const userWallet = selectedAccount?.publicKey.toBase58() || ''; // Use consistent format

  // State for modal (record new sound)
  const [showRecordModal, setShowRecordModal] = React.useState(false);

  // New sound info
  const [newTitle, setNewTitle] = React.useState("");
  const [newColor, setNewColor] = React.useState("#6a89cc");
  const colorOptions = ["#6a89cc", "#38ada9", "#f7b731", "#8854d0", "#20bf6b", "#fd9644"];
  const [newCategoryId, setNewCategoryId] = React.useState<string | null>(null);

  // Modal state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // State for playing sound
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [buttonSound, setButtonSound] = useState<Audio.Sound | null>(null);
  const [buttonProgress, setButtonProgress] = useState(0);
  const [buttonDuration, setButtonDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loadingSoundIndex, setLoadingSoundIndex] = useState<number | null>(null);

  // Fetch categories from Firestore on mount
  useEffect(() => {
    async function fetchCategories() {
      setLoadingCategories(true);
      const snapshot = await getDocs(collection(db, 'categories'));
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
      setLoadingCategories(false);
    }
    fetchCategories();
  }, []);

  // Fetch sounds from Firestore on mount or when selectedCategory changes
  useEffect(() => {
    setLoadingSounds(true);
    let q;
    if (selectedCategory) {
      q = query(collection(db, 'sounds'), where('categoryId', '==', selectedCategory), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'sounds'), orderBy('createdAt', 'desc'));
    }
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const sounds = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SoundButton[];
      // Sort sounds by likes (highest first)
      const sortedSounds = sounds.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      setSoundButtons(sortedSounds);
      setLoadingSounds(false);
    });
    return () => unsubscribe();
  }, [selectedCategory]);

  function handleLike(id: string) {
    setLikes(prev => ({ ...prev, [id]: (prev[id] || 0) + (liked[id] ? -1 : 1) }));
    setLiked(prev => ({ ...prev, [id]: !prev[id] }));
    if (!likeAnim[id]) {
      setLikeAnim(prev => ({ ...prev, [id]: new Animated.Value(1) }));
    }
    Animated.sequence([
      Animated.timing(likeAnim[id] || new Animated.Value(1), { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.timing(likeAnim[id] || new Animated.Value(1), { toValue: 1, duration: 120, useNativeDriver: true })
    ]).start();
  }

  // Helper to format seconds as mm:ss
  const formatTime = (sec: number) => {
    const min = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${min}:${s.toString().padStart(2, '0')}`;
  };

  // Progress calculation
  const progress = 0; // No player object, so progress is 0

  async function handlePlay(index: number, source: any) {
    console.log(`🎵 Starting handlePlay for index: ${index}`);
    
    // If this button is currently playing and not paused, pause it
    if (playingIndex === index && buttonSound && !isPaused) {
      console.log(`⏸️ Pausing sound at index: ${index}`);
      await buttonSound.pauseAsync();
      setIsPaused(true);
      console.log(`✅ Paused sound - no loading state needed`);
      return;
    }
    // If this button is currently paused, resume it
    if (playingIndex === index && buttonSound && isPaused) {
      console.log(`▶️ Resuming sound at index: ${index}`);
      await buttonSound.playAsync();
      setIsPaused(false);
      console.log(`✅ Resumed sound - no loading state needed`);
      return;
    }
    
    // Only set loading state when actually loading a new sound
    setLoadingSoundIndex(index);
    console.log(`🔄 Set loadingSoundIndex to: ${index}`);
    
    // If another button is playing, stop it
    if (playingIndex !== null && buttonSound) {
      console.log(`🛑 Stopping currently playing sound`);
      await buttonSound.stopAsync();
      await buttonSound.unloadAsync();
      setButtonSound(null);
      setPlayingIndex(null);
      setButtonProgress(0);
      setButtonDuration(0);
      setIsPaused(false);
    }
    // Start new playbook
    try {
      console.log(`🎧 Creating new sound for index: ${index}`);
      const { sound, status } = await Audio.Sound.createAsync(source);
      console.log(`🎧 Sound created successfully`);
      await sound.setVolumeAsync(1.0); // Set to max volume
      setButtonSound(sound);
      setPlayingIndex(index);
      setButtonProgress(0);
      setButtonDuration((status && 'durationMillis' in status && status.durationMillis) ? status.durationMillis : 0);
      setIsPaused(false);
      sound.setOnPlaybackStatusUpdate((playbackStatus) => {
        if (!playbackStatus.isLoaded) return;
        if (playbackStatus.isPlaying && playbackStatus.durationMillis) {
          setButtonProgress(playbackStatus.positionMillis / playbackStatus.durationMillis);
        }
        if (playbackStatus.didJustFinish) {
          // Add 1-second visual delay to show completed progress
          setTimeout(() => {
            setPlayingIndex(null);
            setButtonProgress(0);
            setButtonDuration(0);
            sound.unloadAsync();
            setButtonSound(null);
            setIsPaused(false);
          }, 1000);
        }
      });
      console.log(`▶️ Starting playback for index: ${index}`);
      await sound.playAsync();
      
      // Add minimum loading delay to make animation visible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLoadingSoundIndex(null);
      console.log(`✅ Cleared loadingSoundIndex after successful play`);
    } catch (err) {
      console.log(`❌ Error playing sound:`, err);
      Alert.alert('Failed to play sound', String(err));
      setPlayingIndex(null);
      setButtonProgress(0);
      setButtonDuration(0);
      setIsPaused(false);
      setLoadingSoundIndex(null);
      console.log(`✅ Cleared loadingSoundIndex after error`);
    }
  }

  // Permissions and audio mode
  useEffect(() => {
    // No-op for expo-av, permissions handled in startRecording
  }, []);

  async function startRecording() {
    try {
      if (!permissionResponse || permissionResponse.status !== 'granted') {
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });
      // Add a 0.3s delay before starting the recording
      setTimeout(async () => {
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
        setAudioUri(null);
        setAudioDuration(0);
      }, 300);
    } catch (err) {
      Alert.alert('Failed to start recording', String(err));
    }
  }

  async function stopRecording() {
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      const uri = recording.getURI();
      setAudioUri(uri || null);
      setRecording(null);
      // Get duration
      if (uri) {
        const { sound: tempSound, status } = await Audio.Sound.createAsync({ uri });
        setAudioDuration((status && 'durationMillis' in status && status.durationMillis) ? Math.round(status.durationMillis / 1000) : 0);
        await tempSound.unloadAsync();
      }
    } catch (err) {
      Alert.alert('Failed to stop recording', String(err));
    }
  }

  async function playSound() {
    if (!audioUri) return;
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri });
      setSound(newSound);
      setIsPlaying(true);
      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded || !status.isPlaying) {
          setIsPlaying(false);
        }
      });
    } catch (err) {
      Alert.alert('Failed to play sound', String(err));
    }
  }

  const ADMIN_WALLET = '41rpTHnTT3X3ABxyRhJdH8wLwwdWKCH9tKAC1YNFsS2s';

  const anchorWallet = useAnchorWallet();

  const handleCreateButton = useCallback(async () => {
  console.log("test", anchorWallet);
  if (!anchorWallet) {
    Alert.alert('Wallet not connected');
    return;
  }

  if (!audioUri || !newTitle.trim() || !newCategoryId) {
    Alert.alert('Error', 'Please record a sound, enter a title, and select a category.');
    return;
  }

  try {
    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'));
    const address = anchorWallet.publicKey.toBase58();
    const fromPubkey = new solanaWeb3.PublicKey(address);
    const toPubkey = new solanaWeb3.PublicKey(ADMIN_WALLET);

    const latestBlockhash = await connection.getLatestBlockhash();
    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: 0.002 * solanaWeb3.LAMPORTS_PER_SOL,
      })
    );
    transaction.feePayer = fromPubkey;
    transaction.recentBlockhash = latestBlockhash.blockhash;

    // 🔥 Use mobile wallet adapter
    const currentSlot = await connection.getSlot(); // pour minContextSlot
    const signature = await signAndSendTransaction(transaction, currentSlot);
    await connection.confirmTransaction(signature, 'confirmed');

    // Upload + Firestore
    const fileUrl = await uploadAudioToFirebase(audioUri);
    // Use sanitized wallet address to match query logic
    const sanitizedAddress = address.replace(/[\/\.#$\[\]]/g, '_');
    
    console.log('HomeScreen: Creating sound with wallet:', address);
    console.log('HomeScreen: Sanitized wallet for creatorWallet:', sanitizedAddress);
    
    await saveSoundMetadata({
      title: newTitle,
      color: newColor,
      fileUrl,
      wallet: address,
      creatorWallet: sanitizedAddress, // Use sanitized address for consistency
      categoryId: newCategoryId,
    });

    closeModal();
    setNewTitle("");
    setNewColor(colorOptions[0]);
    setAudioDuration(0);
    setNewCategoryId(null);
    Alert.alert('Success', 'Sound uploaded!');
  } catch (err) {
    console.log("error", err);
    Alert.alert('Upload failed', String(err));
  }
}, [audioUri, newTitle, newColor, anchorWallet, newCategoryId]);

  function closeModal() {
    setShowRecordModal(false);
    setRecording(null);
    setAudioUri(null);
    setAudioDuration(0);
    if (sound) {
      sound.unloadAsync();
      setSound(null);
    }
  }

  // Save new sound
  const saveNewSound = () => {
    if (!audioUri || !newTitle.trim()) {
      Alert.alert('Error', 'Please record a sound and enter a title.');
      return;
    }
    setSoundButtons((prev) => {
      const newSound = {
        id: Date.now().toString(),
        title: newTitle,
        color: newColor,
        fileUrl: audioUri || '',
        likes: 0, // New sounds start with 0 likes
      };
      const updatedSounds = [...prev, newSound];
      // Sort by likes (highest first)
      return updatedSounds.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    });
    closeModal();
  };

  // Fetch user likes on mount and when user changes
  useEffect(() => {
    if (!userWallet) {
      setUserLikes(new Set());
      return;
    }
    fetchUserLikes(userWallet).then(setUserLikes);
  }, [userWallet]);

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

  // Split sounds into featured (first) and remaining
  const featuredSound = soundButtons.length > 0 ? soundButtons[0] : null;
  const remainingSounds = soundButtons.slice(1);
  
  // Split remaining sounds into top 4 (positions 1-4) and rest (positions 5+)
  const topFourSounds = remainingSounds.slice(0, 4); // First 4 of remaining (positions 1-4)
  const restSounds = remainingSounds.slice(4); // Everything after first 4 (positions 5+)

  // Handle create button press
  const handleCreatePress = () => {
    if (selectedCategory) {
      setNewCategoryId(selectedCategory);
    } else {
      setNewCategoryId(null);
    }
    setShowRecordModal(true);
  };

  const route = useRoute();
  const currentRouteName = route.name;

  return (
    <View style={styles.container}>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentContainer}>
        {/* User Bolt Badge */}
      <UserBoltBadge />

        {/* Top Section with Cloud Background */}
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

          {/* Categories Section */}
          <View style={styles.categoriesSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              <View style={styles.categoryItem}>
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    selectedCategory === null && styles.categoryButtonSelected
                  ]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    selectedCategory === null && styles.categoryButtonTextSelected
                  ]}>🎵</Text>
                </TouchableOpacity>
                <Text style={styles.categoryLabel}>All</Text>
              </View>
              {loadingCategories ? (
                // Skeleton Categories
                [...Array(4)].map((_, i) => (
                  <View key={i} style={styles.categoryItem}>
                    <Animated.View style={[styles.skeletonCategoryButton, { opacity: shimmerAnim }]} />
                    <Animated.View style={[styles.skeletonCategoryLabel, { opacity: shimmerAnim }]} />
                  </View>
                ))
              ) : (
                categories.map(category => (
                  <View key={category.id} style={styles.categoryItem}>
                    <TouchableOpacity
                      style={[
                        styles.categoryButton,
                        selectedCategory === category.id && styles.categoryButtonSelected
                      ]}
                      onPress={() => setSelectedCategory(category.id)}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        selectedCategory === category.id && styles.categoryButtonTextSelected
                      ]}>{category.emoji}</Text>
                    </TouchableOpacity>
                    <Text style={styles.categoryLabel}>{category.title}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </ImageBackground>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Connect Wallet Notice */}
          {!isConnected && (
            <View style={styles.connectNotice}>
              <MaterialIcons name="info" size={20} color="#EBB41C" />
              <Text style={styles.connectNoticeText}>
                Connect your wallet to like sounds
              </Text>
            </View>
          )}

          {/* Featured Sound */}
          {loadingSounds ? (
            <View style={styles.featuredSection}>
              {/* Skeleton for Featured Sound */}
              <View style={styles.skeletonFeaturedCard}>
                <Animated.View style={[styles.skeletonPlayButton, { opacity: shimmerAnim }]} />
                <Animated.View style={[styles.skeletonLikeButton, { opacity: shimmerAnim }]} />
                <Animated.View style={[styles.skeletonTitle, { opacity: shimmerAnim }]} />
                <Animated.View style={[styles.skeletonCategory, { opacity: shimmerAnim }]} />
              </View>
            </View>
          ) : featuredSound ? (
            <View style={styles.featuredSection}>
              <TouchableOpacity
                onPress={() => handlePlay(0, featuredSound.fileUrl ? { uri: featuredSound.fileUrl } : testAudioSource)}
                activeOpacity={0.8}
                style={[styles.soundCard, styles.featuredWinnerCard]}
              >
                {/* Crown Icon for Featured Sound */}
                <Image
                  source={require('../../assets/crown.png')}
                  style={styles.crownIconCentered}
                  resizeMode="contain"
                />

                {/* Progress Background Overlay for Featured Sound */}
                {playingIndex === 0 && (
                  <View style={styles.progressBackgroundContainer}>
                    <View style={[
                      styles.progressFill, 
                      { 
                        transform: [{ scaleX: buttonProgress }],
                        transformOrigin: 'left',
                        borderTopLeftRadius: 18,
                        borderBottomLeftRadius: 18,
                        borderTopRightRadius: buttonProgress >= 0.98 ? 18 : 0,
                        borderBottomRightRadius: buttonProgress >= 0.98 ? 18 : 0,
                      }
                    ]} />
                  </View>
                )}
                
                {/* Play Button (Top Left) - Visual Only */}
                <View style={styles.playButtonTopLeft}>
                  {loadingSoundIndex === 0 ? (
                    <ActivityIndicator size={36} color="rgba(255, 255, 255, 0.4)" />
                  ) : (
                    <MaterialIcons
                      name={playingIndex === 0 && !isPaused ? 'pause' : 'play-arrow'}
                      size={36}
                      color="white"
                      style={{ opacity: 0.4 }}
                    />
                  )}
                </View>
                
                {/* Title: Bottom Left */}
                <Text style={styles.cardTitle} numberOfLines={2}>{featuredSound.title}</Text>
                
                {/* Like Button + Count: Top Right */}
                <TouchableOpacity 
                  style={[
                    styles.likeButton,
                    !isConnected && styles.likeButtonDisabled
                  ]}
                  onPress={isConnected && hasBoltsRemaining ? async () => {
                    if (!userWallet || !isConnected) return;
                    
                    try {
                      const isLiked = userLikes.has(featuredSound.id);
                      if (isLiked) {
                        setUserLikes(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(featuredSound.id);
                          return newSet;
                        });
                        await unlikeSound(featuredSound.id, userWallet);
                      } else {
                        // Check bolts before allowing like
                        if (!hasBoltsRemaining) {
                          Alert.alert(
                            'No Bolts Remaining!', 
                            'You have used all your bolts for today. Come back tomorrow for more!',
                            [{ text: 'OK' }]
                          );
                          return;
                        }
                        
                        setUserLikes(prev => new Set(prev).add(featuredSound.id));
                        await likeSound(featuredSound.id, userWallet);
                      }
                      
                      // Animate like button
                      const anim = likeAnim[featuredSound.id] || new Animated.Value(1);
                      setLikeAnim(prev => ({ ...prev, [featuredSound.id]: anim }));
                      Animated.sequence([
                        Animated.timing(anim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
                        Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: true })
                      ]).start();
                    } catch (error) {
                      console.error('Error handling featured sound like:', error);
                      Alert.alert('Error', (error as Error).message || 'Failed to like sound');
                    }
                  } : undefined}
                  disabled={!isConnected || (!hasBoltsRemaining && !userLikes.has(featuredSound.id))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Animated.View style={{ transform: [{ scale: likeAnim[featuredSound.id] || new Animated.Value(1) }] }}>
                    <MaterialIcons 
                      name={userLikes.has(featuredSound.id) ? "favorite" : "favorite-border"} 
                      size={28} 
                      color={isConnected ? (userLikes.has(featuredSound.id) ? "#D74A35" : "#FFFFFF") : "#888888"} 
                    />
                  </Animated.View>
                  <Text style={[
                    styles.cardLikeCount,
                    !isConnected && styles.cardLikeCountDisabled
                  ]}>{typeof featuredSound.likes === 'number' ? featuredSound.likes : 0}</Text>
                </TouchableOpacity>
                
                {/* Category Icon: Bottom Right */}
                {(() => {
                  const categoryEmoji = categories.find(cat => cat.id === featuredSound.categoryId)?.emoji || '';
                  return categoryEmoji ? (
                    <Text style={styles.cardCategoryIcon}>{categoryEmoji}</Text>
                  ) : null;
                })()}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.featuredSection}>
              <Text style={{ color: '#FFFFFF', textAlign: 'center', marginTop: 50 }}>No featured sound found.</Text>
            </View>
          )}

          {/* Top 4 Sounds Grid (Positions 1-4) */}
          {loadingSounds ? (
            <View style={styles.soundsGridSection}>
              {/* Skeleton Grid for Top 4 Sound Cards */}
              <View style={styles.skeletonGrid}>
                {[...Array(4)].map((_, i) => (
                  <View key={i} style={styles.skeletonSoundCard}>
                    <Animated.View style={[styles.skeletonPlayButton, { opacity: shimmerAnim }]} />
                    <Animated.View style={[styles.skeletonLikeButton, { opacity: shimmerAnim }]} />
                    <Animated.View style={[styles.skeletonTitle, { opacity: shimmerAnim }]} />
                    <Animated.View style={[styles.skeletonCategory, { opacity: shimmerAnim }]} />
                  </View>
                ))}
              </View>
            </View>
          ) : topFourSounds.length > 0 ? (
            <View style={styles.soundsGridSection}>
              <FlatList
                data={topFourSounds}
                renderItem={({ item, index }) => {
                  const actualIndex = index + 1; // +1 because featured sound is index 0
                  const source = item.fileUrl ? { uri: item.fileUrl } : testAudioSource;
                  const isPlaying = playingIndex === actualIndex;
                  const isLiked = userLikes.has(item.id);
                  const likeCount = typeof item.likes === 'number' ? item.likes : 0;
                  const categoryEmoji = categories.find(cat => cat.id === item.categoryId)?.emoji || '';
                  const anim = likeAnim[item.id] || new Animated.Value(1);

                  // Like/unlike handler
                  const handleLikePress = async () => {
                    if (!userWallet || !isConnected) return;
                    
                    try {
                      if (isLiked) {
                        setUserLikes(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(item.id);
                          return newSet;
                        });
                        await unlikeSound(item.id, userWallet);
                      } else {
                        // Check bolts before allowing like
                        if (!hasBoltsRemaining) {
                          Alert.alert(
                            'No Bolts Remaining!', 
                            'You have used all your bolts for today. Come back tomorrow for more!',
                            [{ text: 'OK' }]
                          );
                          return;
                        }
                        
                        setUserLikes(prev => new Set(prev).add(item.id));
                        await likeSound(item.id, userWallet);
                      }
                      // Trigger animation
                      if (!likeAnim[item.id]) {
                        setLikeAnim(prev => ({ ...prev, [item.id]: new Animated.Value(1) }));
                      }
                      Animated.sequence([
                        Animated.timing(anim, { toValue: 1.3, duration: 120, useNativeDriver: true }),
                        Animated.timing(anim, { toValue: 1, duration: 120, useNativeDriver: true })
                      ]).start();
                    } catch (error) {
                      console.error('Error handling like:', error);
                      Alert.alert('Error', (error as Error).message || 'Failed to like sound');
                      // Revert optimistic update if it failed
                      if (!isLiked) {
                        setUserLikes(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(item.id);
                          return newSet;
                        });
                      }
                    }
                  };

                  return (
                    <TouchableOpacity
                      onPress={() => handlePlay(actualIndex, source)}
                      activeOpacity={0.8}
                      style={[
                        styles.soundCard,
                        actualIndex === 0 && styles.winnerCard,
                      ]}
                    >
                      {/* Crown Icon for Winner (First Sound) */}
                      {actualIndex === 0 && (
                        <Image
                          source={require('../../assets/crown.png')}
                          style={styles.crownIcon}
                          resizeMode="contain"
                        />
                      )}

                      {/* Progress Background Overlay for Grid Sound */}
                      {playingIndex === actualIndex && (
                        <View style={styles.progressBackgroundContainer}>
                          <View style={[
                            styles.progressFill, 
                            { 
                              transform: [{ scaleX: buttonProgress }],
                              transformOrigin: 'left',
                              borderTopLeftRadius: 18,
                              borderBottomLeftRadius: 18,
                              borderTopRightRadius: buttonProgress >= 0.98 ? 18 : 0,
                              borderBottomRightRadius: buttonProgress >= 0.98 ? 18 : 0,
                            }
                          ]} />
                        </View>
                      )}
                      
                      {/* Play Button (Top Left) - Visual Only */}
                      <View style={styles.playButtonTopLeft}>
                        {loadingSoundIndex === actualIndex ? (
                          <ActivityIndicator size={36} color="rgba(255, 255, 255, 0.4)" />
                        ) : (
                          <MaterialIcons
                            name={isPlaying && !isPaused ? 'pause' : 'play-arrow'}
                            size={36}
                            color="white"
                            style={{ opacity: 0.4 }}
                          />
                        )}
                      </View>
                      
                      {/* Title: Bottom Left */}
                      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                      
                      {/* Like Button + Count: Top Right */}
                      <TouchableOpacity 
                        style={[
                          styles.likeButton,
                          !isConnected && styles.likeButtonDisabled
                        ]}
                        onPress={handleLikePress} 
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        disabled={!isConnected || (!hasBoltsRemaining && !userLikes.has(item.id))}
                      >
                        <Animated.View style={{ transform: [{ scale: anim }] }}>
                          <MaterialIcons 
                            name={isLiked ? "favorite" : "favorite-border"} 
                            size={28} 
                            color={isConnected ? (isLiked ? "#D74A35" : "#FFFFFF") : "#888888"} 
                          />
                        </Animated.View>
                        <Text style={[
                          styles.cardLikeCount,
                          !isConnected && styles.cardLikeCountDisabled
                        ]}>{likeCount}</Text>
                      </TouchableOpacity>
                      
                      {/* Category Icon: Bottom Right */}
                      {categoryEmoji && (
                        <Text style={styles.cardCategoryIcon}>{categoryEmoji}</Text>
                      )}
                    </TouchableOpacity>
                  );
                }}
                numColumns={2}
                columnWrapperStyle={styles.soundGridRow}
                contentContainerStyle={styles.soundGridRow}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              />
            </View>
          ) : null}

          {/* Featured Advertising Card - Between positions 5 and 6 */}
          {loadingSounds ? (
            <View style={styles.advertisingSection}>
              {/* Skeleton for Advertising Card */}
              <View style={styles.skeletonAdvertisingCard}>
                <Animated.View style={[styles.skeletonPlayButton, { opacity: shimmerAnim }]} />
                <Animated.View style={[styles.skeletonTitle, { opacity: shimmerAnim }]} />
              </View>
            </View>
          ) : (
            <View style={styles.advertisingSection}>
              <TouchableOpacity
                onPress={() => handlePlay(999, testAudioSource)} // Use index 999 for advertising
                activeOpacity={0.8}
                style={[styles.soundCard, styles.advertisingCard]}
              >
                {/* Progress Background Overlay for Advertising */}
                {playingIndex === 999 && (
                  <View style={styles.progressBackgroundContainer}>
                    <View style={[
                      styles.progressFill, 
                      { 
                        transform: [{ scaleX: buttonProgress }],
                        transformOrigin: 'left',
                        borderTopLeftRadius: 18,
                        borderBottomLeftRadius: 18,
                        borderTopRightRadius: buttonProgress >= 0.98 ? 18 : 0,
                        borderBottomRightRadius: buttonProgress >= 0.98 ? 18 : 0,
                      }
                    ]} />
                  </View>
                )}
                
                {/* Play Button (Top Left) - Visual Only */}
                <View style={styles.playButtonTopLeft}>
                  {loadingSoundIndex === 999 ? (
                    <ActivityIndicator size={36} color="rgba(255, 255, 255, 0.4)" />
                  ) : (
                    <MaterialIcons
                      name={playingIndex === 999 && !isPaused ? 'pause' : 'play-arrow'}
                      size={36}
                      color="white"
                      style={{ opacity: 0.4 }}
                    />
                  )}
                </View>
                
                {/* Title: Bottom Left */}
                <Text style={styles.cardTitle} numberOfLines={2}>Featured Advertisement</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Rest of Sounds Grid (Positions 5+) */}
          {!loadingSounds && restSounds.length > 0 ? (
            <View style={styles.soundsGridSection}>
              <FlatList
                data={restSounds}
                renderItem={({ item, index }) => {
                  const actualIndex = index + 5; // +5 because these start at position 5 (after featured + top 4)
                  const source = item.fileUrl ? { uri: item.fileUrl } : testAudioSource;
                  const isPlaying = playingIndex === actualIndex;
                  const isLiked = userLikes.has(item.id);
                  const likeCount = typeof item.likes === 'number' ? item.likes : 0;
                  const categoryEmoji = categories.find(cat => cat.id === item.categoryId)?.emoji || '';
                  const anim = likeAnim[item.id] || new Animated.Value(1);

                  // Like/unlike handler
                  const handleLikePress = async () => {
                    if (!userWallet || !isConnected) return;
                    
                    try {
                      if (isLiked) {
                        setUserLikes(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(item.id);
                          return newSet;
                        });
                        await unlikeSound(item.id, userWallet);
                      } else {
                        // Check bolts before allowing like
                        if (!hasBoltsRemaining) {
                          Alert.alert(
                            'No Bolts Remaining!', 
                            'You have used all your bolts for today. Come back tomorrow for more!',
                            [{ text: 'OK' }]
                          );
                          return;
                        }
                        
                        setUserLikes(prev => new Set(prev).add(item.id));
                        await likeSound(item.id, userWallet);
                      }
                      // Trigger animation
                      if (!likeAnim[item.id]) {
                        setLikeAnim(prev => ({ ...prev, [item.id]: new Animated.Value(1) }));
                      }
                      Animated.sequence([
                        Animated.timing(anim, { toValue: 1.3, duration: 120, useNativeDriver: true }),
                        Animated.timing(anim, { toValue: 1, duration: 120, useNativeDriver: true })
                      ]).start();
                    } catch (error) {
                      console.error('Error handling like:', error);
                      Alert.alert('Error', (error as Error).message || 'Failed to like sound');
                      // Revert optimistic update if it failed
                      if (!isLiked) {
                        setUserLikes(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(item.id);
                          return newSet;
                        });
                      }
                    }
                  };

                  return (
                    <TouchableOpacity
                      onPress={() => handlePlay(actualIndex, source)}
                      activeOpacity={0.8}
                      style={styles.soundCard}
                    >
                      {/* Progress Background Overlay for Grid Sound */}
                      {playingIndex === actualIndex && (
                        <View style={styles.progressBackgroundContainer}>
                          <View style={[
                            styles.progressFill, 
                            { 
                              transform: [{ scaleX: buttonProgress }],
                              transformOrigin: 'left',
                              borderTopLeftRadius: 18,
                              borderBottomLeftRadius: 18,
                              borderTopRightRadius: buttonProgress >= 0.98 ? 18 : 0,
                              borderBottomRightRadius: buttonProgress >= 0.98 ? 18 : 0,
                            }
                          ]} />
                        </View>
                      )}
                      
                      {/* Play Button (Top Left) - Visual Only */}
                      <View style={styles.playButtonTopLeft}>
                        {loadingSoundIndex === actualIndex ? (
                          <ActivityIndicator size={36} color="rgba(255, 255, 255, 0.4)" />
                        ) : (
                          <MaterialIcons
                            name={isPlaying && !isPaused ? 'pause' : 'play-arrow'}
                            size={36}
                            color="white"
                            style={{ opacity: 0.4 }}
                          />
                        )}
                      </View>
                      
                      {/* Title: Bottom Left */}
                      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                      
                      {/* Like Button + Count: Top Right */}
                      <TouchableOpacity 
                        style={[
                          styles.likeButton,
                          !isConnected && styles.likeButtonDisabled
                        ]}
                        onPress={handleLikePress} 
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        disabled={!isConnected || (!hasBoltsRemaining && !userLikes.has(item.id))}
                      >
                        <Animated.View style={{ transform: [{ scale: anim }] }}>
                          <MaterialIcons 
                            name={isLiked ? "favorite" : "favorite-border"} 
                            size={28} 
                            color={isConnected ? (isLiked ? "#D74A35" : "#FFFFFF") : "#888888"} 
                          />
                        </Animated.View>
                        <Text style={[
                          styles.cardLikeCount,
                          !isConnected && styles.cardLikeCountDisabled
                        ]}>{likeCount}</Text>
                      </TouchableOpacity>
                      
                      {/* Category Icon: Bottom Right */}
                      {categoryEmoji && (
                        <Text style={styles.cardCategoryIcon}>{categoryEmoji}</Text>
                      )}
                    </TouchableOpacity>
                  );
                }}
                numColumns={2}
                columnWrapperStyle={styles.soundGridRow}
                contentContainerStyle={styles.soundGridRow}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNavigation 
        selectedTab={currentRouteName}
        onTabChange={setSelectedTab}
        onCreatePress={handleCreatePress}
        navigation={navigation}
      />

      {/* Record Modal - keep existing modal as requested */}
      {showRecordModal && (
        <Modal
          visible={showRecordModal}
          animationType="slide"
          transparent
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentCard}>
              {/* Close icon at top right */}
              <TouchableOpacity style={styles.modalCloseIcon} onPress={closeModal} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
                <MaterialIcons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              {!isConnected && (
                <Text style={{ color: '#ff5a5f', fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>
                  You must be connected to create a new button.
                </Text>
              )}
              <Text style={styles.modalTitle}>Create New Sound Button</Text>
              <Text style={{ color: '#ffeb3b', fontSize: 13, marginTop: 2, marginBottom: 10, textAlign: 'center' }}>
                It will cost 0.002 SOL (onchain storage)
              </Text>
              <View style={{ alignItems: 'center', marginVertical: 24, width: '100%' }}>
                {/* Record/Stop Button */}
                <TouchableOpacity
                  style={styles.modalRecordButton}
                  onPress={recording ? stopRecording : startRecording}
                  activeOpacity={0.8}
                  disabled={!isConnected}
                >
                  <MaterialIcons name={recording ? "stop" : "fiber-manual-record"} size={32} color={recording ? "#fff" : "#ff5a5f"} />
                  <Text style={styles.modalRecordText}>{recording ? 'Stop Recording' : 'Start Recording'}</Text>
                </TouchableOpacity>
                {/* Play Button and Duration */}
                {audioUri && (
                  <>
                    <View style={{ height: 16 }} />
                    <TouchableOpacity
                      style={styles.modalPlayButton}
                      onPress={playSound}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={28} color="#fff" />
                    </TouchableOpacity>
                    <Text style={{ color: '#fff', marginTop: 8, marginBottom: 8 }}>
                      Audio length: {audioDuration}s
                    </Text>
                  </>
                )}
                {/* Title Input */}
                <Text style={{ color: '#fff', marginTop: 24, marginBottom: 8 }}>Title (max 20 chars):</Text>
                <TextInput
                  style={[styles.input, { color: '#fff', backgroundColor: '#333', marginBottom: 12 }]}
                  value={newTitle}
                  onChangeText={text => setNewTitle(text.slice(0, 25))}
                  placeholder="Enter title"
                  placeholderTextColor="#aaa"
                  maxLength={20}
                  editable={isConnected}
                />
                {/* Color Picker */}
                <Text style={{ color: '#fff', marginBottom: 8 }}>Pick a color:</Text>
                <View style={styles.colorPickerRow}>
                  {colorOptions.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorCircle, { backgroundColor: color, borderWidth: newColor === color ? 3 : 1, borderColor: newColor === color ? '#fff' : '#ccc' }]}
                      onPress={() => setNewColor(color)}
                    />
                  ))}
                </View>
                {/* Category Picker in Modal */}
                <Text style={{ color: '#fff', marginTop: 12, marginBottom: 8 }}>Category:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {loadingCategories ? (
                    <ActivityIndicator size="small" color="#EBB41C" />
                  ) : (
                    categories.map(category => (
                      <TouchableOpacity
                        key={category.id}
                        style={{
                          backgroundColor: newCategoryId === category.id ? '#ffeb3b' : '#333',
                          borderRadius: 16,
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          marginRight: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                        onPress={() => {
                          if (newCategoryId === category.id) {
                            setNewCategoryId(null);
                          } else {
                            setNewCategoryId(category.id);
                          }
                        }}
                      >
                        <Text style={{ fontSize: 22 }}>{category.emoji}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
                {/* Create Button */}
                <View style={{ marginTop: 24, width: '100%' }}>
                  <TouchableOpacity
                    style={styles.modalCreateButton}
                    onPress={handleCreateButton}
                    activeOpacity={0.8}
                    disabled={!isConnected}
                  >
                    <Text style={styles.modalCreateButtonText}>Create Button</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3896AB', // Light blue background
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 80, // Space for bottom nav
  },
  
  // Cloud Background Section
  cloudBackground: {
    width: '100%',
    height: 240, // Increased height to accommodate categories properly
    paddingTop: 0, // Start near the very top
    paddingBottom: 0, // Remove bottom padding
  },
  
  // Logo Section
  logoContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 20, // Minimal top spacing
    paddingBottom: 8, // Minimal bottom spacing
  },
  logo: {
    width: 168,
    height: 168,
  },
  
  // Categories Section
  categoriesSection: {
    paddingBottom: 32, // Increased bottom spacing to ensure clear separation
    marginBottom: 16, // Additional margin for extra separation
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
    paddingVertical: 8, // Add vertical padding to category container
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  categoryButton: {
    backgroundColor: '#D74A35', // Red for unselected
    borderRadius: 18, // Match create button shape (rounded square)
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  categoryButtonSelected: {
    backgroundColor: '#EBB41C', // Yellow for selected
  },
  categoryButtonText: {
    fontSize: 24,
    color: '#FFFFFF', // White for unselected
  },
  categoryButtonTextSelected: {
    color: '#151515', // Dark for selected
  },
  categoryLabel: {
    color: '#FFFFFF',
    fontSize: 14, // Increased from 12
    fontWeight: 'bold', // Made bold
    textAlign: 'center',
    maxWidth: 64,
  },
  
  // Content Section
  contentSection: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 80, // Increased top padding for better separation
  },
  
  // Featured Sound Section
  featuredSection: {
    marginBottom: 24,
  },
  featuredSoundCard: {
    backgroundColor: '#2B6B79',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  featuredContent: {
    position: 'relative',
  },
  featuredInfo: {
    marginBottom: 16,
  },
  featuredTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  featuredSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
  },
  featuredControls: {
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 32,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  startButtonText: {
    color: '#151515',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Sounds Grid Section
  soundsGridSection: {
    marginBottom: 4, // Reduced from 20 to minimize space before advertising card
  },
  soundGridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  soundCard: {
    backgroundColor: '#2B6B79', // Dark blue
    borderRadius: 18, // Updated to match requirements
    padding: 12, // Added padding as suggested
    width: '48%',
    minHeight: 120,
    position: 'relative', // For absolute positioning of child elements
    overflow: 'hidden', // Prevent content overflow
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  winnerCard: {
    borderWidth: 3,
    borderColor: '#EBB41C',
    shadowColor: '#EBB41C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6, // for Android
  },
  featuredWinnerCard: {
    width: '100%',
    height: 140,
    borderRadius: 18,
    borderWidth: 5, // Increased from 3 to 5 for stronger border
    borderColor: '#EBB41C',
    shadowColor: '#EBB41C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, // Increased from 0.4 to 0.6 for stronger glow
    shadowRadius: 10, // Increased from 6 to 10 for wider glow
    elevation: 10, // Increased from 6 to 10 for Android
    overflow: 'hidden',
    position: 'relative',
  },
  crownIcon: {
    position: 'absolute',
    bottom: 8, // Move to bottom instead of top
    alignSelf: 'center',
    width: 72, // Even bigger crown
    height: 72, // Even bigger crown
    zIndex: 3,
  },
  crownIconCentered: {
    position: 'absolute',
    top: '60%', // Move lower on the featured card
    alignSelf: 'center',
    width: 100, // Much bigger for featured sound
    height: 100, // Much bigger for featured sound
    zIndex: 5,
    shadowColor: '#EBB41C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    transform: [{ translateY: -50 }], // Center vertically (half of 100px size)
  },

  // New styles for advertising card
  advertisingSection: {
    marginTop: 0, // Reduced from 24 to balance with soundsGridSection marginBottom (20)
    marginBottom: 24,
  },
  advertisingCard: {
    width: '100%',
    height: 140,
    borderRadius: 18,
    borderWidth: 5, // Same as featuredWinnerCard
    borderColor: '#D74A35', // Red border for advertising card
    shadowColor: '#D74A35', // Red glow for advertising card
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, // Strong glow like winner cards
    shadowRadius: 10, // Wide glow like winner cards
    elevation: 10, // Android shadow like winner cards
    overflow: 'hidden',
    position: 'relative',
  },

  
  // Modal Styles (keeping existing as requested)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentCard: {
    backgroundColor: 'rgba(34,34,34,0.98)',
    borderRadius: 24,
    padding: 28,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  modalCloseIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalRecordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 32,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  modalRecordText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 12,
  },
  modalPlayButton: {
    backgroundColor: '#444',
    borderRadius: 32,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  modalCreateButton: {
    backgroundColor: '#ff5a5f',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCreateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginBottom: 16,
    fontSize: 16,
  },
  colorPickerRow: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'center',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#ccc',
  },

  // New styles for progress background overlay
  progressBackgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18, // Match updated card border radius
    overflow: 'hidden', // Ensure fill respects border radius
    zIndex: 0, // Behind content but above card background
  },
  progressFill: {
    height: '100%',
    width: '100%', // Full width for scaleX transform to work from
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Semi-transparent white overlay
    // Border radius now applied dynamically based on progress
  },

  // New styles for grid sound cards
  cardTitle: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    color: '#FFFFFF',
    fontSize: 16, // Updated from 18 to 16
    fontWeight: '600',
    lineHeight: 20, // Adjusted to match font size
    zIndex: 1,
  },
  likeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    alignItems: 'center', // Center align the icon and count
    zIndex: 1,
  },
  cardLikeCount: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 4, // Added spacing below icon
    textAlign: 'center',
    zIndex: 1, // Above other elements
  },
  cardCategoryIcon: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    fontSize: 32, // Updated from 40 to 32
    color: '#FFFFFF', // Added explicit white color
    zIndex: 1, // Above title and like button
  },
  playButtonTopLeft: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36, // Updated to match icon size
    height: 36, // Updated to match icon size
    borderRadius: 18, // Half of width/height for circular button
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // Above other content
  },
  likeButtonDisabled: {
    opacity: 0.5,
  },
  cardLikeCountDisabled: {
    color: '#888888',
  },

  // New styles for connect wallet notice
  connectNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2B6B79',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 16,
    alignSelf: 'center',
    width: '90%',
    borderWidth: 1,
    borderColor: '#EBB41C',
  },
  connectNoticeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // New styles for skeleton loading
  skeletonFeaturedCard: {
    width: '100%', // Full width like real featured card
    height: 140, // Same height as real featured card
    backgroundColor: '#2B6B79',
    borderRadius: 18, // Same border radius as real featured card
    borderWidth: 5, // Same border width as real featured card
    borderColor: '#EBB41C', // Same golden border color as real featured card
    shadowColor: '#EBB41C', // Same golden glow as real featured card
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, // Same shadow opacity as real featured card
    shadowRadius: 10, // Same shadow radius as real featured card
    elevation: 10, // Same elevation as real featured card
    position: 'relative',
    overflow: 'hidden',
  },
  skeletonPlayButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1,
  },
  skeletonLikeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1,
  },
  skeletonTitle: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: '80%',
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    zIndex: 1,
  },
  skeletonCategory: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 1,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  skeletonSoundCard: {
    width: '48%', // Adjust as needed for 2 columns
    minHeight: 120,
    backgroundColor: '#2B6B79',
    borderRadius: 18,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  skeletonCategoryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 18,
    width: 64,
    height: 64,
    marginBottom: 8,
  },
  skeletonCategoryLabel: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    width: 60,
    height: 16,
    marginTop: 4,
  },
  skeletonAdvertisingCard: {
    width: '100%',
    height: 140,
    borderRadius: 18,
    borderWidth: 5, // Same as featuredWinnerCard
    borderColor: '#D74A35', // Red border for advertising card
    shadowColor: '#D74A35', // Red glow for advertising card
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, // Strong glow like winner cards
    shadowRadius: 10, // Wide glow like winner cards
    elevation: 10, // Android shadow like winner cards
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#2B6B79', // Base background color
  },
});
