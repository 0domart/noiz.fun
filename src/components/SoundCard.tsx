import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface SoundCardProps {
  item: any;
  index: number;
  onPlay: (index: number, source: any) => void;
  onLike?: () => void;
  isPlaying: boolean;
  isPaused: boolean;
  buttonProgress: number;
  loadingSoundIndex: number | null;
  isLiked: boolean;
  likeAnim: Animated.Value;
  categoryEmoji: string;
  source: any;
  showRankCrown?: boolean; // Optional crown for winner
  isConnected?: boolean;
  hasBoltsRemaining?: boolean; // Whether user has bolts left today
}

export function SoundCard({
  item,
  index,
  onPlay,
  onLike,
  isPlaying,
  isPaused,
  buttonProgress,
  loadingSoundIndex,
  isLiked,
  likeAnim,
  categoryEmoji,
  source,
  showRankCrown = false,
  isConnected = true,
  hasBoltsRemaining = true
}: SoundCardProps) {
  const likeCount = typeof item.likes === 'number' ? item.likes : 0;

  return (
    <TouchableOpacity
      onPress={() => onPlay(index, source)}
      activeOpacity={0.8}
      style={[
        styles.soundCard,
        showRankCrown && styles.winnerCard,
      ]}
    >
      {/* Crown Icon for Winner */}
      {showRankCrown && (
        <Image
          source={require('../../assets/crown.png')}
          style={styles.crownIcon}
          resizeMode="contain"
        />
      )}

      {/* Progress Background Overlay */}
      {isPlaying && (
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
        {loadingSoundIndex === index ? (
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
        onPress={isConnected && hasBoltsRemaining ? onLike : undefined}
        disabled={!isConnected || !hasBoltsRemaining}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Animated.View style={{ transform: [{ scale: likeAnim }] }}>
          <MaterialIcons
            name={isLiked ? "favorite" : "favorite-border"}
            size={28}
            color={isConnected ? (isLiked ? "#D74A35" : "#FFFFFF") : "#888888"}
          />
        </Animated.View>
        <Text style={[styles.cardLikeCount, !isConnected && styles.cardLikeCountDisabled]}>{likeCount}</Text>
      </TouchableOpacity>
      
      {/* Category Icon: Bottom Right */}
      {categoryEmoji && (
        <Text style={styles.cardCategoryIcon}>{categoryEmoji}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  soundCard: {
    backgroundColor: '#2B6B79', // Dark blue
    borderRadius: 18,
    padding: 12,
    width: '48%',
    minHeight: 120,
    position: 'relative',
    overflow: 'hidden',
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
  crownIcon: {
    position: 'absolute',
    bottom: 8, // Move to bottom instead of top
    alignSelf: 'center',
    width: 72, // Even bigger crown
    height: 72, // Even bigger crown
    zIndex: 3,
  },
  progressBackgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    overflow: 'hidden',
    zIndex: 0,
  },
  progressFill: {
    height: '100%',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  playButtonTopLeft: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  cardTitle: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    zIndex: 1,
  },
  likeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 1,
  },
  likeButtonDisabled: {
    opacity: 0.5,
    pointerEvents: 'none',
  },
  cardLikeCount: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    zIndex: 1,
  },
  cardLikeCountDisabled: {
    color: '#888888',
  },
  cardCategoryIcon: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    fontSize: 32,
    color: '#FFFFFF',
    zIndex: 1,
  },
}); 