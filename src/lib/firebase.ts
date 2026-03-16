import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCDt-Kjcn1_kMCcmtslunmsxdDnPjKjZjA",
  authDomain: "campushub-489622.firebaseapp.com",
  projectId: "campushub-489622",
  storageBucket: "campushub-489622.firebasestorage.app",
  messagingSenderId: "230534988583",
  appId: "1:230534988583:android:5542b690da8d2d2b465f02",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
