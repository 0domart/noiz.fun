import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function checkUserBolts(userWallet: string): Promise<{ hasBoltsRemaining: boolean; boltsUsed: number; boltsRemaining: number }> {
  if (!userWallet) {
    return { hasBoltsRemaining: true, boltsUsed: 0, boltsRemaining: 5 };
  }

  try {
    const sanitizedWallet = userWallet.replace(/[\/\.#$\[\]]/g, '_');
    
    // Get start of today in UTC
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTodayTimestamp = Timestamp.fromDate(startOfToday);

    // Query today's likes
    const likesQuery = query(
      collection(db, 'likes'),
      where('userWallet', '==', sanitizedWallet),
      where('createdAt', '>=', startOfTodayTimestamp)
    );
    
    const querySnapshot = await getDocs(likesQuery);
    const boltsUsed = querySnapshot.docs.length;
    const boltsRemaining = Math.max(0, 5 - boltsUsed);
    
    return {
      hasBoltsRemaining: boltsRemaining > 0,
      boltsUsed,
      boltsRemaining
    };
  } catch (error) {
    console.error('Error checking user bolts:', error);
    // Return conservative result on error
    return { hasBoltsRemaining: true, boltsUsed: 0, boltsRemaining: 5 };
  }
} 