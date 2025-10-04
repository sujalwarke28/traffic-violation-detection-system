// Firebase web config
const firebaseConfig = {
  apiKey: "AIzaSyD0FmiJ4Gm9Ax9ccS8pEV9jbN-ZGomKXok",
  authDomain: "traffic-violation-9566c.firebaseapp.com",
  projectId: "traffic-violation-9566c",
  storageBucket: "traffic-violation-9566c.firebasestorage.app",
  messagingSenderId: "866166880475",
  appId: "1:866166880475:web:0bc19cb418a7bc56ccb4fe",
  measurementId: "G-NLF70Q9GZK"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    // Try popup first
    await auth.signInWithPopup(provider);
  } catch (e) {
    // Common cases: popup blocked, unsupported environment on mobile browsers
    const fallbackErrs = [
      'auth/popup-blocked',
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request',
      'auth/operation-not-supported-in-this-environment',
    ];
    if (fallbackErrs.some(code => String(e?.code||'').includes(code))) {
      // Fallback to redirect flow
      await auth.signInWithRedirect(provider);
      return;
    }
    throw e;
  }
}

async function signOut() {
  await auth.signOut();
}

async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
}

window.firebaseAuth = { auth, signInWithGoogle, signOut, getIdToken };


