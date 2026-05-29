import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyA1tuyXSUfEeBvOfmDhULUv7w4luLRMyk",
  authDomain: "cliptracker-pro.firebaseapp.com",
  projectId: "cliptracker-pro",
  storageBucket: "cliptracker-pro.firebasestorage.app",
  messagingSenderId: "1014682676837",
  appId: "1:1014682676837:web:a34d1dbe804ccb5a90608c",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)