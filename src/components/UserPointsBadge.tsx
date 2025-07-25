import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuthorization } from '../utils/useAuthorization';

export const UserPointsBadge = () => {
  const { selectedAccount } = useAuthorization();
  const [points, setPoints] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Floating animation for subtle movement
  const floatAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (!selectedAccount) {
      setPoints(0);
      return;
    }

    setLoading(true);
    const userWallet = selectedAccount.publicKey.toBase58(); // Use same format as sound creation
    const sanitizedWallet = userWallet.replace(/[\/\.#$\[\]]/g, '_');

    // Create real-time listener for user's sounds
    const soundsQuery = query(
      collection(db, 'sounds'),
      where('creatorWallet', '==', sanitizedWallet),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(soundsQuery, 
      (querySnapshot) => {
        try {
          const userSounds = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
          
          // Calculate total likes received
          const totalLikes = userSounds.reduce((sum, sound) => sum + (sound.likes || 0), 0);
          
          // Calculate points: totalLikes * 10
          setPoints(totalLikes * 10);
          setLoading(false);
        } catch (error) {
          console.error('Error processing user points:', error);
          setPoints(0);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error listening to user sounds:', error);
        setPoints(0);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount or wallet change
    return () => unsubscribe();
  }, [selectedAccount]);

  useEffect(() => {
    // Subtle floating animation
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    
    floatingAnimation.start();
    return () => floatingAnimation.stop();
  }, [floatAnim]);

  // Interpolate float animation value
  const floatValue = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3], // Subtle upward floating movement
  });

  // Don't render if user is not connected
  if (!selectedAccount) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: floatValue }],
        },
      ]}
    >
      <Text style={styles.text}>
        {loading ? '...' : `${points} pts`}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#D74A35',
    paddingVertical: 8, // Slightly more padding for square shape
    paddingHorizontal: 12,
    borderRadius: 12, // Square with rounded corners like nav buttons
    zIndex: 5, // Lower zIndex so it scrolls with content
    elevation: 12, // Enhanced Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 4 }, // Deeper shadow
    shadowOpacity: 0.3, // More prominent shadow
    shadowRadius: 8, // Larger blur radius
    // Additional shadow layers for more depth
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minWidth: 48, // Ensure consistent width like nav buttons
    minHeight: 48, // Ensure consistent height like nav buttons
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.5)', // Text shadow for better readability
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
  },
}); 