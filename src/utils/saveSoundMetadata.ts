import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export async function saveSoundMetadata({ title, color, fileUrl, wallet, creatorWallet, likes = 0, categoryId }: { title: string; color: string; fileUrl: string; wallet: string; creatorWallet: string; likes?: number; categoryId: string; }) {
  await addDoc(collection(db, 'sounds'), {
    title,
    color,
    fileUrl,
    wallet,
    creatorWallet,
    likes,
    categoryId,
    createdAt: Timestamp.now(),
  });
} 