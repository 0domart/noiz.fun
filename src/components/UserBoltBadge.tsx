import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuthorization } from '../utils/useAuthorization';

export const UserBoltBadge = () => {
  const { selectedAccount } = useAuthorization();
  const [boltsRemaining, setBoltsRemaining] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(false);

  const MAX_BOLTS_PER_DAY = 5;

  useEffect(() => {
    if (!selectedAccount) {
      setBoltsRemaining(5);
      return;
    }

    setLoading(true);
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
          const remaining = Math.max(0, MAX_BOLTS_PER_DAY - todayLikesCount);
          console.log('⚡ UserBoltBadge: Bolt count updated - likes today:', todayLikesCount, 'remaining:', remaining);
          setBoltsRemaining(remaining);
          setLoading(false);
        } catch (error) {
          console.error('Error processing user bolts:', error);
          setBoltsRemaining(5);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error listening to user likes:', error);
        setBoltsRemaining(5);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount or wallet change
    return () => unsubscribe();
  }, [selectedAccount]);

  // Don't render if user is not connected
  if (!selectedAccount) return null;

  const renderBolts = () => {
    const bolts = [];
    const topRowBolts = [];
    const bottomRowBolts = [];
    
    // Render remaining bolts (normal color)
    for (let i = 0; i < boltsRemaining; i++) {
      const boltIcon = (
        <Image
          key={`bolt-${i}`}
          source={require('../../assets/noiz_bolt1.png')}
          style={styles.boltIcon}
          resizeMode="contain"
        />
      );
      
      if (i < 2) { // First 2 bolts go in top row
        topRowBolts.push(boltIcon);
      } else {
        bottomRowBolts.push(boltIcon);
      }
    }
    
    // Render used bolts (grayed out)
    const usedBolts = MAX_BOLTS_PER_DAY - boltsRemaining;
    for (let i = 0; i < usedBolts; i++) {
      const boltIcon = (
        <Image
          key={`used-bolt-${i}`}
          source={require('../../assets/noiz_bolt1.png')}
          style={[styles.boltIcon, styles.usedBoltIcon]}
          resizeMode="contain"
        />
      );
      
      const totalIndex = boltsRemaining + i;
      if (totalIndex < 2) { // First 2 positions go in top row
        topRowBolts.push(boltIcon);
      } else {
        bottomRowBolts.push(boltIcon);
      }
    }
    
    return (
      <>
        <View style={styles.boltRow}>
          {topRowBolts}
        </View>
        <View style={styles.boltRow}>
          {bottomRowBolts}
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.boltsContainer}>
        {loading ? (
          // Show placeholder bolts while loading in 2 rows
          <>
            <View style={styles.boltRow}>
              {[...Array(2)].map((_, i) => (
                <Image
                  key={`loading-bolt-top-${i}`}
                  source={require('../../assets/noiz_bolt1.png')}
                  style={[styles.boltIcon, styles.usedBoltIcon]}
                  resizeMode="contain"
                />
              ))}
            </View>
            <View style={styles.boltRow}>
              {[...Array(3)].map((_, i) => (
                <Image
                  key={`loading-bolt-bottom-${i}`}
                  source={require('../../assets/noiz_bolt1.png')}
                  style={[styles.boltIcon, styles.usedBoltIcon]}
                  resizeMode="contain"
                />
              ))}
            </View>
          </>
        ) : (
          renderBolts()
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    left: 16, // Position on the left instead of right
    zIndex: 5, // Add zIndex to ensure visibility
    alignItems: 'center',
    justifyContent: 'center',
  },
  boltsContainer: {
    flexDirection: 'column', // Changed to column
    // Remove marginBottom since we're not showing text
  },
  boltIcon: {
    width: 28, // Bigger bolts (increased from 24)
    height: 28, // Bigger bolts (increased from 24)
    marginHorizontal: 0, // No spacing between bolts for minimal width
  },
  usedBoltIcon: {
    opacity: 0.3, // Gray out used bolts
    tintColor: '#000000', // Make them black
  },
  boltRow: {
    flexDirection: 'row',
    justifyContent: 'center', // Center the bolts in each row
    marginBottom: 2, // Minimal space between rows
  },
  // Remove text and loading text styles since we're not showing them
}); 