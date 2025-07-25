import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function uploadAudioToFirebase(audioUri: string): Promise<string> {
  // Fetch the file as a blob
  const response = await fetch(audioUri);
  const blob = await response.blob();
  const ext = audioUri.split('.').pop() || 'm4a';
  const fileName = `sounds/${Date.now()}.${ext}`;
  const storageRef = ref(storage, fileName);
  await uploadBytes(storageRef, blob);
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
} 