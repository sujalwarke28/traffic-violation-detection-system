import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin with env vars or service account json path
if (!admin.apps.length) {
  try {
    // Try to load service account key directly
    const serviceAccountPath = join(__dirname, '../../serviceAccountKey.json');
    console.log('Loading Firebase service account from:', serviceAccountPath);
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin initialized successfully');
  } catch (err) {
    console.error('Firebase Admin init error:', err.message);
    console.error('Stack:', err.stack);
  }
} else {
  console.log('Firebase Admin already initialized');
}

export async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length)
      : null;
    if (!token) {
      console.error('Auth error: Missing bearer token');
      return res.status(401).json({ error: 'Missing bearer token' });
    }
    console.log('Verifying token...');
    const decoded = await admin.auth().verifyIdToken(token);
    console.log('Token verified for user:', decoded.uid);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid token', details: err.message });
  }
}


