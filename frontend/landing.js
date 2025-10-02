const btnSignInAdmin = document.getElementById('btnSignInAdmin');
const btnSignInDriver = document.getElementById('btnSignInDriver');
const btnSignOut = document.getElementById('btnSignOut');
const signedOut = document.getElementById('signedOut');
const signedIn = document.getElementById('signedIn');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const statusEl = document.getElementById('status');

function setStatus(t){ statusEl.textContent = t; }

function updateUI(u){
  if(u){
    signedOut.classList.add('hidden');
    signedIn.classList.remove('hidden');
    userName.textContent = u.displayName || u.email;
    userAvatar.src = u.photoURL || '';
  } else {
    signedOut.classList.remove('hidden');
    signedIn.classList.add('hidden');
  }
}

btnSignInAdmin.addEventListener('click', async ()=>{
  try{
    await window.firebaseAuth.signInWithGoogle();
    window.location.href = './admin.html';
  }catch(e){ setStatus(e.message); }
});

btnSignInDriver.addEventListener('click', async ()=>{
  try{
    await window.firebaseAuth.signInWithGoogle();
    window.location.href = './driver.html';
  }catch(e){ setStatus(e.message); }
});

btnSignOut?.addEventListener('click', async ()=>{
  try{
    await window.firebaseAuth.signOut();
    updateUI(null);
  }catch(e){ setStatus(e.message); }
});

window.firebaseAuth.auth.onAuthStateChanged(updateUI);
