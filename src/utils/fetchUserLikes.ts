import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export async function fetchUserLikes(userWallet: string): Promise<Set<string>> {
  if (!userWallet) {
    return new Set();
  }
  
  // Sanitize userWallet to match the format used in likeSound/unlikeSound
  const sanitizedWallet = userWallet.replace(/[\/\.#$\[\]]/g, '_');
  
  const q = query(collection(db, 'likes'), where('userWallet', '==', sanitizedWallet));
  const querySnapshot = await getDocs(q);
  return new Set(querySnapshot.docs.map(doc => doc.data().buttonId));
} 