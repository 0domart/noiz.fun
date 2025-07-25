import { doc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function unlikeSound(soundId: string, userWallet: string): Promise<void> {
  try {
    // Validate inputs
    if (!soundId || !userWallet) {
      throw new Error('soundId and userWallet are required');
    }

    // Sanitize userWallet to remove invalid characters for Firestore document IDs
    const sanitizedWallet = userWallet.replace(/[\/\.#$\[\]]/g, '_');
    
    await updateDoc(doc(db, 'sounds', soundId), { likes: increment(-1) });
    await deleteDoc(doc(db, 'likes', `${soundId}_${sanitizedWallet}`));
  } catch (err) {
    console.error('unlikeSound error:', err);
    throw err;
  }
} 