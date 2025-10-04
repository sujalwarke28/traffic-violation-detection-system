const btnSignIn = document.getElementById('btnSignIn');
const btnSignOut = document.getElementById('btnSignOut');
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');

const inpName = document.getElementById('inpName');
const inpEmail = document.getElementById('inpEmail');
const inpVehicleType = document.getElementById('inpVehicleType');
const inpVehicleModel = document.getElementById('inpVehicleModel');
const inpVehicleColor = document.getElementById('inpVehicleColor');
const inpPlateNumber = document.getElementById('inpPlateNumber');
const plateImage = document.getElementById('plateImage');
const btnReadPlate = document.getElementById('btnReadPlate');
const btnClearPlate = document.getElementById('btnClearPlate');
const btnRegister = document.getElementById('btnRegister');
const plateDrop = document.getElementById('plateDrop');
const platePreview = document.getElementById('platePreview');
const dStatus = document.getElementById('driverStatus');
const detectedPlate = document.getElementById('detectedPlate');

// Tabs & lists
const btnTabHome = document.getElementById('btnTabHome');
const btnTabProfile = document.getElementById('btnTabProfile');
const homePanel = document.getElementById('homePanel');
const profilePanel = document.getElementById('profilePanel');
const profileCard = document.getElementById('profileCard');
const registerBlock = document.getElementById('registerBlock');
const btnEditProfile = document.getElementById('btnEditProfile');
const btnSaveProfile = document.getElementById('btnSaveProfile');
const btnCancelEdit = document.getElementById('btnCancelEdit');
const pendingList = document.getElementById('pendingList');
const paidList = document.getElementById('paidList');
const btnRefreshHome = document.getElementById('btnRefreshHome');

const plateCanvas = document.createElement('canvas');
const ctx = plateCanvas.getContext('2d');
const API_BASE = (typeof window !== 'undefined' && window.API_BASE) ? window.API_BASE : 'http://localhost:4000';

function setStatus(t){ dStatus.textContent = t; }

// Greeting helper
function computeGreeting(user){
  try{
    const h = new Date().getHours();
    const part = h < 12 ? 'Good morning' : (h < 18 ? 'Good afternoon' : 'Good evening');
    const name = (user?.displayName) || (user?.email ? String(user.email).split('@')[0] : '');
    return name ? `${part}, ${name}` : part;
  }catch{ return 'Welcome'; }
}
function updateGreeting(user){
  const el = document.getElementById('greeting');
  if(!el) return;
  el.textContent = user ? computeGreeting(user) : 'Welcome';
}

// Refresh Home lists (Pending and Paid)
async function refreshHome(){
  try{
    const token = await window.firebaseAuth.getIdToken(); if(!token) return;
    const [pend, paid] = await Promise.all([
      axios.get(`${API_BASE}/api/drivers/violations?status=pending`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${API_BASE}/api/drivers/violations?status=paid`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    renderList(pendingList, pend.data||[], true);
    renderList(paidList, paid.data||[], false);
  }catch(e){ console.error('refreshHome failed', e); }
}

btnRefreshHome.addEventListener('click', refreshHome);

function renderList(hostEl, items, showPay){
  hostEl.innerHTML = '';
  if(!items.length){ hostEl.innerHTML = '<div class="card">No items.</div>'; return; }
  items.forEach(v=>{
    const div = document.createElement('div'); div.className='card';
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <div><strong>Violations:</strong> ${(v.violationTypes||[]).join(', ')||'None'}</div>
        <div><strong>Amount:</strong> ₹${v.amount??0}</div>
      </div>
      <div><strong>Plate:</strong> ${v.plateText||'-'}</div>
      <div><strong>Helmet:</strong> ${v.helmetDetected===null?'Unknown':(v.helmetDetected?'Yes':'No')}</div>
      <div><strong>Riders:</strong> ${v.riderCount??'-'}</div>
      <div style="margin-top:6px;display:flex;gap:8px;align-items:center;">
        ${v.imageUrl ? `<img src="${v.imageUrl}" alt="snap" style="width:140px;border-radius:6px;border:1px solid #1f2937;"/>` : ''}
        <span class="label">${new Date(v.createdAt).toLocaleString()}</span>
      </div>
      ${showPay ? '<div class="actions"><button class="btn primary payBtn">Pay</button></div>' : ''}
    `;
    if(showPay){
      div.querySelector('.payBtn').addEventListener('click', async ()=>{
        try{
          const token = await window.firebaseAuth.getIdToken(); if(!token) return alert('Sign in first');
          // 1) Create order
          const orderRes = await axios.post(`${API_BASE}/api/payments/create-order`, { violationId: v._id }, { headers: { Authorization: `Bearer ${token}` } });
          const { orderId, amount, currency, keyId } = orderRes.data;

          // 2) Open Razorpay
          const options = {
            key: keyId,
            amount,
            currency,
            name: 'Traffic Violation Payment',
            description: (v.violationTypes||[]).join(', ') || 'Fine',
            order_id: orderId,
            handler: async function (response) {
              try{
                await axios.post(`${API_BASE}/api/payments/verify`, {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  violationId: v._id,
                }, { headers: { Authorization: `Bearer ${token}` } });
                await refreshHome();
              }catch(e){
                alert('Verification failed: '+(e.response?.data?.error||e.message));
              }
            },
            prefill: {},
            theme: { color: '#3b82f6' }
          };
          const rzp = new window.Razorpay(options);
          rzp.open();
        }catch(e){ alert('Payment init failed: '+(e.response?.data?.error||e.message)); }
      });
    }
    hostEl.appendChild(div);
  });
}

btnSignIn.addEventListener('click', async ()=>{ try{ await window.firebaseAuth.signInWithGoogle(); }catch(e){ alert(e.message); } });
btnSignOut?.addEventListener('click', async ()=>{
  try{
    const ok = confirm('Are you sure you want to sign out?');
    if(!ok) return;
    await window.firebaseAuth.signOut();
    window.location.href = './landing.html';
  }catch(e){ alert(e.message); }
});

window.firebaseAuth.auth.onAuthStateChanged(async u=>{
  if(u){
    btnSignIn.classList.add('hidden');
    userInfo.classList.remove('hidden');
    userName.textContent = u.displayName || u.email;
    userAvatar.src = u.photoURL || '';
    updateGreeting(u);
    // Auto-fill name/email if empty
    if(!inpName.value) inpName.value = u.displayName || '';
    if(!inpEmail.value) inpEmail.value = u.email || '';
    refreshRegisterEnabled();
    await loadProfile();
    await refreshHome();
  } else {
    btnSignIn.classList.remove('hidden');
    userInfo.classList.add('hidden');
    btnRegister.disabled = true;
    profileCard.classList.add('hidden');
    registerBlock.classList.remove('hidden');
    btnEditProfile.classList.add('hidden');
    btnSaveProfile.classList.add('hidden');
    btnCancelEdit.classList.add('hidden');
    updateGreeting(null);
  }
});

let lastPlateImageDataUrl = null;

// Drag & drop helpers
function preventDefaults(e){ e.preventDefault(); e.stopPropagation(); }
['dragenter','dragover','dragleave','drop'].forEach(ev=> plateDrop.addEventListener(ev, preventDefaults));
plateDrop.addEventListener('click', ()=> plateImage.click());
plateDrop.addEventListener('drop', async (e)=>{
  const file = e.dataTransfer?.files?.[0]; if(!file) return; await handlePlateFile(file);
});

plateImage.addEventListener('change', async (e)=>{
  const file = e.target.files?.[0]; if(!file) return; await handlePlateFile(file);
});

async function handlePlateFile(file){
  const bmp = await createImageBitmap(file);
  plateCanvas.width = bmp.width; plateCanvas.height = bmp.height; ctx.drawImage(bmp,0,0);
  lastPlateImageDataUrl = plateCanvas.toDataURL('image/jpeg',0.9);
  if(platePreview){ platePreview.src = lastPlateImageDataUrl; platePreview.classList.remove('hidden'); }
  setStatus('Plate image loaded. You can Read Plate Number or edit it manually.');
  refreshRegisterEnabled();
}

btnClearPlate.addEventListener('click', ()=>{
  lastPlateImageDataUrl = null; detectedPlate.textContent = '-';
  if(platePreview){ platePreview.src=''; platePreview.classList.add('hidden'); }
  setStatus('Cleared plate image.');
  refreshRegisterEnabled();
});

btnReadPlate.addEventListener('click', async ()=>{
  try{
    if(!plateCanvas.width || !plateCanvas.height){ return alert('Upload a plate image first'); }
    setStatus('Reading plate number…');
    const { data: { text } } = await Tesseract.recognize(plateCanvas, 'eng', { tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-' });
    const plate = (text || '').replace(/\s+/g,'').toUpperCase();
    inpPlateNumber.value = plate;
    detectedPlate.textContent = plate || '-';
    setStatus(plate ? `Detected: ${plate}` : 'Could not read plate');
    refreshRegisterEnabled();
  }catch(e){ setStatus('OCR failed: '+e.message); }
});

// Enable register button when required fields are present
;[inpName, inpEmail, inpVehicleType, inpVehicleModel, inpVehicleColor, inpPlateNumber].forEach(el=> el.addEventListener('input', refreshRegisterEnabled));
function refreshRegisterEnabled(){
  const ok = (inpName.value.trim() && inpEmail.value.trim() && inpPlateNumber.value.trim());
  btnRegister.disabled = !ok;
}

btnRegister.addEventListener('click', async ()=>{
  try{
    const token = await window.firebaseAuth.getIdToken(); if(!token) return alert('Sign in first');
    const payload = {
      email: inpEmail.value.trim(),
      name: inpName.value.trim(),
      plateNumber: inpPlateNumber.value.trim().toUpperCase(),
      vehicleType: inpVehicleType.value,
      vehicleModel: inpVehicleModel.value.trim(),
      vehicleColor: inpVehicleColor.value.trim(),
      plateImageUrl: lastPlateImageDataUrl || null,
    };
    if(!payload.name || !payload.email || !payload.plateNumber){ setStatus('Name, Email and Plate Number are required'); return; }
    await axios.post(`${API_BASE}/api/drivers/register`, payload, { headers: { Authorization: `Bearer ${token}` } });
    setStatus('Registered successfully');
    await loadProfile();
  }catch(e){
    setStatus('Registration failed: '+(e.response?.data?.error || e.message));
  }
});

// Tabs
btnTabHome.addEventListener('click', ()=>{ btnTabHome.classList.add('primary'); btnTabProfile.classList.remove('primary'); homePanel.classList.remove('hidden'); profilePanel.classList.add('hidden'); refreshHome(); });
btnTabProfile.addEventListener('click', ()=>{ btnTabProfile.classList.add('primary'); btnTabHome.classList.remove('primary'); profilePanel.classList.remove('hidden'); homePanel.classList.add('hidden'); loadProfile(); });

async function loadProfile(){
  try{
    const token = await window.firebaseAuth.getIdToken(); if(!token) return;
    const res = await axios.get(`${API_BASE}/api/drivers/profile`, { headers: { Authorization: `Bearer ${token}` } });
    const d = res.data;
    profileCard.classList.remove('hidden');
    registerBlock.classList.add('hidden');
    btnEditProfile.classList.remove('hidden');
    btnSaveProfile.classList.add('hidden');
    btnCancelEdit.classList.add('hidden');
    profileCard.innerHTML = `
      <div class="headline">${d.name}</div>
      <div class="label">${d.email}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px">
        <div><div class="label">Plate</div><div class="value">${d.plateNumber}</div></div>
        <div><div class="label">Vehicle</div><div class="value">${d.vehicleType} ${d.vehicleModel||''}</div></div>
        <div><div class="label">Color</div><div class="value">${d.vehicleColor||'-'}</div></div>
      </div>
      ${d.plateImageUrl ? `<div style="margin-top:10px"><div class="label">Plate Image</div><img src="${d.plateImageUrl}" alt="plate" class="preview" style="max-width:360px"/></div>` : ''}
      <div class="label" style="margin-top:6px">Created: ${new Date(d.createdAt).toLocaleString()}</div>`;
    setStatus('');
  }catch(e){
    // If no profile, keep registration block visible
    profileCard.classList.add('hidden');
    registerBlock.classList.remove('hidden');
    setStatus(e.response?.data?.error || 'No profile found. Please register.');
    btnEditProfile.classList.add('hidden');
    btnSaveProfile.classList.add('hidden');
    btnCancelEdit.classList.add('hidden');
  }
}

// Edit profile flow
let currentProfile = null;
btnEditProfile?.addEventListener('click', async ()=>{
  try{
    const token = await window.firebaseAuth.getIdToken(); if(!token) return;
    const res = await axios.get(`${API_BASE}/api/drivers/profile`, { headers: { Authorization: `Bearer ${token}` } });
    const d = res.data; currentProfile = d;
    // Prefill form
    inpName.value = d.name || '';
    inpEmail.value = d.email || '';
    inpVehicleType.value = d.vehicleType || 'motorcycle';
    inpVehicleModel.value = d.vehicleModel || '';
    inpVehicleColor.value = d.vehicleColor || '';
    inpPlateNumber.value = d.plateNumber || '';
    if(d.plateImageUrl){ platePreview.src = d.plateImageUrl; platePreview.classList.remove('hidden'); }

    // Toggle UI
    profileCard.classList.add('hidden');
    registerBlock.classList.remove('hidden');
    btnRegister.classList.add('hidden');
    btnSaveProfile.classList.remove('hidden');
    btnCancelEdit.classList.remove('hidden');
    btnEditProfile.classList.add('hidden');
    setStatus('Editing profile');
  }catch(e){ setStatus('Load profile failed: '+(e.response?.data?.error||e.message)); }
});

btnCancelEdit?.addEventListener('click', ()=>{
  // Restore card view
  registerBlock.classList.add('hidden');
  profileCard.classList.remove('hidden');
  btnRegister.classList.remove('hidden');
  btnSaveProfile.classList.add('hidden');
  btnCancelEdit.classList.add('hidden');
  btnEditProfile.classList.remove('hidden');
  setStatus('');
});

btnSaveProfile?.addEventListener('click', async ()=>{
  try{
    const token = await window.firebaseAuth.getIdToken(); if(!token) return alert('Sign in first');
    const payload = {
      email: inpEmail.value.trim(),
      name: inpName.value.trim(),
      plateNumber: inpPlateNumber.value.trim(),
      vehicleType: inpVehicleType.value,
      vehicleModel: inpVehicleModel.value.trim(),
      vehicleColor: inpVehicleColor.value.trim(),
    };
    // Only send plateImageUrl if a new one was uploaded in this session
    if(lastPlateImageDataUrl) payload.plateImageUrl = lastPlateImageDataUrl;
    setStatus('Saving changes…');
    await axios.patch(`${API_BASE}/api/drivers/profile`, payload, { headers: { Authorization: `Bearer ${token}` } });
    setStatus('Saved');
    // Restore view
    btnRegister.classList.remove('hidden');
    btnSaveProfile.classList.add('hidden');
    btnCancelEdit.classList.add('hidden');
    btnEditProfile.classList.remove('hidden');
    registerBlock.classList.add('hidden');
    profileCard.classList.remove('hidden');
    await loadProfile();
  }catch(e){ setStatus('Save failed: '+(e.response?.data?.error||e.message)); }
});
