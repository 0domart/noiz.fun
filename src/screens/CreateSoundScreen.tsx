import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, ImageBackground, FlatList } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useAuthorization } from '../utils/useAuthorization';
import { uploadAudioToFirebase } from '../utils/uploadAudioToFirebase';
import { useMobileWallet } from '../utils/useMobileWallet';
import { saveSoundMetadata } from '../utils/saveSoundMetadata';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { BottomNavigation } from '../components/BottomNavigation';
import { useRoute } from '@react-navigation/native';
import * as solanaWeb3 from '@solana/web3.js';
import { useAnchorWallet } from "../utils/useAnchorWallet";

// Admin wallet address for receiving payments
const ADMIN_WALLET = "7YWHMfk9JtNNkL4gP9z1k9GKxYnNJc1aFx4vZr8sZm9T"; // Replace with actual admin wallet

// Define types
interface Category {
  id: string;
  title: string;
  emoji: string;
}

export function CreateSoundScreen({ navigation }: { navigation: any }) {
  // User Auth
  const { selectedAccount } = useAuthorization();
  const anchorWallet = useAnchorWallet();
  const { signAndSendTransaction, signIn, connect } = useMobileWallet();
  const isConnected = !!selectedAccount;
  const userWallet = selectedAccount?.publicKey.toBase58() || '';

  // Navigation State
  const route = useRoute();
  const currentRouteName = route.name;
  const [selectedTab, setSelectedTab] = useState('Create');

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);

  // Simplified recording state (no modal)
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  // Loading state
  const [isCreating, setIsCreating] = useState(false);

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

  // Direct recording logic (no modal)
  const handleRecord = async () => {
    if (recording) {
      // Stop recording
      try {
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
        const recordingUri = recording.getURI();
        setUri(recordingUri || null);
        setRecording(null);
        
        if (recordingUri) {
          const { sound: tempSound } = await Audio.Sound.createAsync({ uri: recordingUri });
          setSound(tempSound);
        }
      } catch (err) {
        Alert.alert('Failed to stop recording', String(err));
      }
    } else {
      // Start recording
      try {
        if (!permissionResponse || permissionResponse.status !== 'granted') {
          await requestPermission();
        }
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: false,
        });
        
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(newRecording);
        setUri(null);
        if (sound) {
          await sound.unloadAsync();
          setSound(null);
        }
      } catch (err) {
        Alert.alert('Failed to start recording', String(err));
      }
    }
  };

  const handleReplay = async () => {
    if (sound && uri) {
      try {
        setIsPlaying(true);
        await sound.replayAsync();
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded || !status.isPlaying) {
            setIsPlaying(false);
          }
        });
      } catch (err) {
        Alert.alert('Failed to play sound', String(err));
        setIsPlaying(false);
      }
    }
  };

  const handleReset = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
      }
      if (sound) {
        await sound.unloadAsync();
      }
      setRecording(null);
      setUri(null);
      setSound(null);
      setIsPlaying(false);
    } catch (err) {
      console.error('Error resetting:', err);
    }
  };

  // Handle create button with Solana transaction
  const handleCreateButton = useCallback(async () => {
    if (!anchorWallet) {
      Alert.alert('Wallet not connected', 'Please connect your wallet to create a sound.');
      return;
    }

    if (!uri) {
      Alert.alert('Recording required', 'Please record audio before creating.');
      return;
    }

    if (!newTitle.trim()) {
      Alert.alert('Title required', 'Please enter a title for your sound.');
      return;
    }

    // Category is optional - will use "all" if not selected

    setIsCreating(true);
    try {
      // Step 1: Send Solana transaction (0.002 SOL to admin wallet)
      const address = anchorWallet.publicKey.toBase58();
      const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'));
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

      const currentSlot = await connection.getSlot();
      const signature = await signAndSendTransaction(transaction, currentSlot);
      
      // Wait for transaction confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // Step 2: Proceed with Firebase upload after successful transaction
      const fileUrl = await uploadAudioToFirebase(uri);
      const sanitizedAddress = address.replace(/[\/\.#$\[\]]/g, '_');
      
      // Save metadata to Firestore
      await saveSoundMetadata({
        title: newTitle,
        color: "#6a89cc", // Default color
        fileUrl,
        wallet: address,
        creatorWallet: sanitizedAddress,
        likes: 0,
        categoryId: newCategoryId || "all", // Use "all" if no category selected
      });

      Alert.alert('Success', 'Your sound has been created and transaction confirmed!', [
        {
          text: 'OK',
          onPress: () => {
            // Reset form
            setNewTitle("");
            setNewCategoryId(null);
            handleReset();
            // Navigate back to Home
            navigation.navigate('Home');
          }
        }
      ]);
    } catch (error) {
      console.error('Error creating sound:', error);
      const errorMessage = String(error);
      if (errorMessage.includes('insufficient funds')) {
        Alert.alert('Insufficient Funds', 'You need at least 0.002 SOL plus gas fees to create a sound.');
      } else if (errorMessage.includes('rejected')) {
        Alert.alert('Transaction Cancelled', 'The transaction was cancelled by the user.');
      } else {
        Alert.alert('Error', 'Failed to create sound. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  }, [anchorWallet, uri, newTitle, newCategoryId, signAndSendTransaction, navigation]);

  // Handle create button press from bottom nav
  const handleCreatePress = () => {
    // Already on create screen, maybe scroll to top or show some feedback
  };

  return (
    <View style={styles.container}>
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
        {/* Connection Warning */}
        {!isConnected && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              You must be connected to create a sound.
            </Text>
          </View>
        )}

        {/* Cost Info */}
        {isConnected && (
          <View style={styles.costContainer}>
            <Text style={styles.costText}>
              💰 Cost: 0.002 SOL (onchain storage)
            </Text>
          </View>
        )}

        {/* Title Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Title (max 20 chars):</Text>
          <TextInput
            style={styles.input}
            value={newTitle}
            onChangeText={text => setNewTitle(text.slice(0, 20))}
            placeholder="Enter title"
            placeholderTextColor="#aaa"
            maxLength={20}
            editable={isConnected}
          />
        </View>

        {/* Control Buttons Row: Replay | Record | Reset */}
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.sideButton, { opacity: uri ? 1 : 0.3 }]}
            onPress={handleReplay}
            disabled={!uri || isPlaying || !isConnected}
            activeOpacity={0.8}
          >
            <MaterialIcons name={isPlaying ? 'pause' : 'replay'} size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.recordButton, recording && styles.recordButtonActive]}
            onPress={handleRecord}
            disabled={!isConnected}
            activeOpacity={0.8}
          >
            <MaterialIcons 
              name={recording ? "stop" : "fiber-manual-record"} 
              size={48} 
              color="#fff" 
            />
            <Text style={styles.recordButtonText}>
              {recording ? 'STOP' : 'RECORD'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sideButton, { opacity: (uri || recording) ? 1 : 0.3 }]}
            onPress={handleReset}
            disabled={(!uri && !recording) || !isConnected}
            activeOpacity={0.8}
          >
            <MaterialIcons name="delete" size={24} color="#fff" />
          </TouchableOpacity>
        </View>



        {/* Category Selection (Optional) */}
        <View style={styles.inputSection}>
          {loadingCategories ? (
            <ActivityIndicator size="small" color="#EBB41C" />
          ) : (
            <FlatList
              data={categories}
              renderItem={({ item: category }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    newCategoryId === category.id && styles.categoryButtonSelected
                  ]}
                  onPress={() => {
                    if (!isConnected) return;
                    if (newCategoryId === category.id) {
                      setNewCategoryId(null);
                    } else {
                      setNewCategoryId(category.id);
                    }
                  }}
                  disabled={!isConnected}
                >
                  <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                  <Text style={[
                    styles.categoryText,
                    newCategoryId === category.id && styles.categoryTextSelected
                  ]}>
                    {category.title}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesContainer}
              contentContainerStyle={styles.categoriesContent}
            />
          )}
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, { opacity: (!uri || !newTitle.trim() || isCreating || !isConnected) ? 0.5 : 1 }]}
          onPress={handleCreateButton}
          disabled={!uri || !newTitle.trim() || isCreating || !isConnected}
          activeOpacity={0.8}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>CREATE</Text>
          )}
        </TouchableOpacity>
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
  cloudBackground: {
    width: '100%',
    height: 200,
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
    width: 140,
    height: 140,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100, // Space for bottom nav
  },
  warningContainer: {
    backgroundColor: '#ff5a5f',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  warningText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
  },
  costContainer: {
    backgroundColor: 'rgba(255, 235, 59, 0.2)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    width: '100%',
  },
  costText: {
    color: '#ffeb3b',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 13,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    width: '100%',
  },
  sideButton: {
    backgroundColor: '#2c3e50',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  recordButton: {
    backgroundColor: '#D74A35',
    borderRadius: 35,
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  recordButtonActive: {
    backgroundColor: '#ff1744',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },

  inputSection: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2c3e50',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  categoriesContainer: {
    marginTop: 8,
    height: 50, // Single row height
  },
  categoriesContent: {
    paddingRight: 16, // Extra space at the end for scrolling
  },
  categoryButton: {
    backgroundColor: '#2c3e50',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryButtonSelected: {
    backgroundColor: '#ffeb3b',
  },
  categoryEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTextSelected: {
    color: '#000',
  },
  createButton: {
    backgroundColor: '#EBB41C',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginTop: 0,
    minWidth: 120,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 