import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, ImageBackground } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuthorization } from '../utils/useAuthorization';

// Define types
type LeaderboardUser = {
  wallet: string;
  displayName: string;
  totalLikes: number;
  totalPoints: number;
  rank: number;
};

interface LeaderboardModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ visible, onClose }) => {
  const { selectedAccount } = useAuthorization();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [userRank, setUserRank] = useState<number | null>(null);

  const currentUserWallet = selectedAccount?.publicKey.toBase58();
  const sanitizedCurrentWallet = currentUserWallet?.replace(/[\/\.#$\[\]]/g, '_');

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Get all sounds from Firestore
      const soundsQuery = query(collection(db, 'sounds'), orderBy('createdAt', 'desc'));
      const soundsSnapshot = await getDocs(soundsQuery);
      
      // Group sounds by creator and calculate total likes
      const userStats: { [wallet: string]: { totalLikes: number; wallet: string } } = {};
      
      soundsSnapshot.docs.forEach(doc => {
        const sound = doc.data();
        const creatorWallet = sound.wallet;
        
        if (creatorWallet) {
          if (!userStats[creatorWallet]) {
            userStats[creatorWallet] = { totalLikes: 0, wallet: creatorWallet };
          }
          userStats[creatorWallet].totalLikes += (sound.likes || 0);
        }
      });
      
      // Convert to array and calculate points
      const allUsers: LeaderboardUser[] = Object.values(userStats)
        .map(user => ({
          wallet: user.wallet,
          displayName: user.wallet.length > 8 ? `${user.wallet.slice(0, 4)}...${user.wallet.slice(-4)}` : user.wallet,
          totalLikes: user.totalLikes,
          totalPoints: user.totalLikes * 10,
          rank: 0, // Will be set after sorting
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints) // Sort by points descending
        .map((user, index) => ({ ...user, rank: index + 1 })); // Add rank

      // Get top 10 for display
      const top10 = allUsers.slice(0, 10);
      setLeaderboardData(top10);

      // Find current user's rank in full list
      if (sanitizedCurrentWallet) {
        const currentUser = allUsers.find(user => user.wallet === sanitizedCurrentWallet);
        setUserRank(currentUser ? currentUser.rank : null);
      }
      
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      Alert.alert('Error', 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when modal opens
  useEffect(() => {
    if (visible) {
      fetchLeaderboard();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
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

        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>🏆 Leaderboard</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <MaterialIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Leaderboard Content */}
        <ScrollView 
          style={styles.leaderboardContainer} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          {/* Rewards Section - Now scrollable */}
          <View style={styles.rewardsSection}>
            <View style={styles.rewardsContainer}>
              <Text style={styles.rewardsTitle}>🎉 REWARDS 🎉</Text>
              <View style={styles.bonkReward}>
                <Text style={styles.bonkAmount}>100M</Text>
                <Text style={styles.bonkToken}>BONK</Text>
              </View>
              <Text style={styles.surprisesText}>+ A LOT OF SURPRISES!</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#EBB41C" />
              <Text style={styles.loadingText}>Loading leaderboard...</Text>
            </View>
          ) : leaderboardData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No data available</Text>
            </View>
          ) : (
            <>
              {leaderboardData.map((user, index) => {
                const isCurrentUser = user.wallet === sanitizedCurrentWallet;
                const isTopUser = user.rank === 1;
                
                return (
                  <View 
                    key={user.wallet}
                    style={[
                      styles.leaderboardRow,
                      isCurrentUser && styles.currentUserRow,
                      isTopUser && styles.topUserRow
                    ]}
                  >
                    <View style={styles.rankContainer}>
                      {isTopUser ? (
                        <Text style={[styles.crownText]}>👑</Text>
                      ) : (
                        <Text style={[styles.rankText, isCurrentUser && styles.currentUserText]}>
                          {user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : `#${user.rank}`}
                        </Text>
                      )}
                    </View>
                    
                    <View style={styles.userInfoContainer}>
                      <Text style={[
                        styles.usernameText, 
                        isCurrentUser && styles.currentUserText,
                        isTopUser && styles.topUserText
                      ]}>
                        {isCurrentUser ? '👤 You' : user.displayName}
                      </Text>
                    </View>
                    
                    <View style={styles.statsContainer}>
                      <Text style={[
                        styles.likesText, 
                        isCurrentUser && styles.currentUserText,
                        isTopUser && styles.topUserText
                      ]}>
                        🔥 {user.totalPoints}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Show user rank if not in top 10 */}
              {userRank && userRank > 10 && (
                <View style={styles.userRankContainer}>
                  <Text style={styles.userRankText}>
                    👀 Your Rank: #{userRank}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#2c3e50',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c3e50',
    marginVertical: 8,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  currentUserRow: {
    backgroundColor: '#EBB41C',
    borderColor: '#FFC107',
  },
  topUserRow: {
    backgroundColor: '#FFD700',
    borderColor: '#FFA000',
    padding: 22,
    marginVertical: 12,
  },
  rankContainer: {
    width: 60,
    alignItems: 'center',
  },
  rankText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  crownText: {
    fontSize: 32,
  },
  userInfoContainer: {
    flex: 1,
    marginLeft: 16,
  },
  usernameText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  topUserText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  likesText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  pointsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  currentUserText: {
    color: '#000',
  },
  userRankContainer: {
    backgroundColor: '#34495e',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  userRankText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Rewards section styles
  rewardsSection: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginBottom: 20,
  },
  rewardsContainer: {
    backgroundColor: 'rgba(235, 180, 28, 0.15)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EBB41C',
  },
  rewardsTitle: {
    color: '#EBB41C',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  bonkReward: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  bonkAmount: {
    color: '#fff',
    fontSize: 42,
    fontWeight: 'bold',
    marginRight: 8,
    textShadowColor: 'rgba(235, 180, 28, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  bonkToken: {
    color: '#EBB41C',
    fontSize: 24,
    fontWeight: 'bold',
  },
  surprisesText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.9,
  },
}); 