// src/utils/firebase.ts
// Replace the config object below with your Firebase project credentials
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyDNewHBwTLkXKlrl6I1UTYT-RP4BjAOhEM",
    authDomain: "soundbox-dadf2.firebaseapp.com",
    projectId: "soundbox-dadf2",
    storageBucket: "soundbox-dadf2.firebasestorage.app",
    messagingSenderId: "390680250691",
    appId: "1:390680250691:web:876b0290050a5c73e987f6",
    measurementId: "G-2YCG0J4SZY"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app); 