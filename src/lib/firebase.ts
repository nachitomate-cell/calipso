import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore,  type Firestore }   from 'firebase/firestore'
import { getAuth,       type Auth }         from 'firebase/auth'
import { getStorage,    type FirebaseStorage } from 'firebase/storage'
import { getAnalytics, isSupported }        from 'firebase/analytics'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Solo inicializa Firebase si existen credenciales reales.
// Sin ellas, la app funciona en modo demo/mock (ver USE_MOCK en api.ts).
const HAS_FIREBASE = !!firebaseConfig.projectId && !!firebaseConfig.apiKey

let _app:     FirebaseApp       | null = null
let _db:      Firestore         | null = null
let _auth:    Auth              | null = null
let _storage: FirebaseStorage   | null = null

if (HAS_FIREBASE) {
  _app     = initializeApp(firebaseConfig)
  _db      = getFirestore(_app)
  _auth    = getAuth(_app)
  _storage = getStorage(_app)

  if (firebaseConfig.measurementId) {
    isSupported().then(yes => { if (yes && _app) getAnalytics(_app) })
  }
} else {
  console.warn(
    '[Calipso] Firebase env vars no encontrados — iniciando en modo demo.\n' +
    'Copia .env.example → .env.local y completa las credenciales para conectar Firebase.'
  )
}

// Los exports son null en mock mode; api.ts nunca los usa cuando USE_MOCK=true.
export const db      = _db      as Firestore
export const auth    = _auth    as Auth
export const storage = _storage as FirebaseStorage
