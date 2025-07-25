import { db } from './firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';

export async function fetchSounds(categoryId?: string) {
  let q;
  if (categoryId) {
    q = query(collection(db, 'sounds'), where('categoryId', '==', categoryId), orderBy('createdAt', 'desc'));
  } else {
    q = query(collection(db, 'sounds'), orderBy('createdAt', 'desc'));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
} 