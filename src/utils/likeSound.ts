import { doc, updateDoc, increment, setDoc, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export async function likeSound(soundId: string, userWallet: string): Promise<void> {
  try {
    // Validate inputs
    if (!soundId || !userWallet) {
      throw new Error('soundId and userWallet are required');
    }

    console.log('🔥 likeSound called with:', { soundId, userWallet });

    // Sanitize userWallet to remove invalid characters for Firestore document IDs
    const sanitizedWallet = userWallet.replace(/[\/\.#$\[\]]/g, '_');
    console.log('👤 Sanitized wallet:', sanitizedWallet);
    
    // Check if user has bolts remaining today
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTodayTimestamp = Timestamp.fromDate(startOfToday);

    // Query today's likes to check bolt usage
    const likesQuery = query(
      collection(db, 'likes'),
      where('userWallet', '==', sanitizedWallet),
      where('createdAt', '>=', startOfTodayTimestamp)
    );
    
    const querySnapshot = await getDocs(likesQuery);
    const boltsUsedToday = querySnapshot.docs.length;
    const MAX_BOLTS_PER_DAY = 5;
    
    if (boltsUsedToday >= MAX_BOLTS_PER_DAY) {
      throw new Error('You have used all your bolts for today! Come back tomorrow for more.');
    }
    
    console.log('🔥 likeSound: Starting database operations for soundId:', soundId);
    console.log('👤 likeSound: User wallet (sanitized):', sanitizedWallet);
    console.log('⚡ likeSound: Bolts used today before this like:', boltsUsedToday);
    
    // Step 1: Increment the likes count on the sound document
    console.log('📈 likeSound: Incrementing likes count for sound:', soundId);
    try {
      await updateDoc(doc(db, 'sounds', soundId), { likes: increment(1) });
      console.log('✅ likeSound: Successfully incremented likes count for sound:', soundId);
    } catch (updateError) {
      console.error('❌ Error updating likes count:', updateError);
      throw new Error(`Failed to update likes count: ${updateError}`);
    }
    
    // Step 2: Add a like record to track bolt usage
    const likeDocId = `${soundId}_${sanitizedWallet}`;
    console.log('⚡ likeSound: Adding bolt usage record with ID:', likeDocId);
    const likeData = { 
      buttonId: soundId, 
      userWallet: sanitizedWallet,
      createdAt: Timestamp.now() // Add timestamp for daily tracking
    };
    console.log('📊 Like data to save:', likeData);
    
    try {
      await setDoc(doc(db, 'likes', likeDocId), likeData);
      console.log('✅ likeSound: Successfully added bolt usage record:', likeDocId);
      console.log('🎉 likeSound: All database operations completed successfully!');
    } catch (setDocError) {
      console.error('❌ Error saving like record:', setDocError);
      throw new Error(`Failed to save like record: ${setDocError}`);
    }
  } catch (err) {
    console.error('likeSound error:', err);
    throw err;
  }
} 