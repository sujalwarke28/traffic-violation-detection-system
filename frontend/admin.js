const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const btnSignIn = document.getElementById('btnSignIn');
const btnSignOut = document.getElementById('btnSignOut');
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');

const imageInput = document.getElementById('imageInput');
const btnCamera = document.getElementById('btnCamera');
const btnProcess = document.getElementById('btnProcess');
const btnSave = document.getElementById('btnSave');
const btnFetch = document.getElementById('btnFetch');

const plateTextEl = document.getElementById('plateText');
const riderCountEl = document.getElementById('riderCount');
const helmetDetectedEl = document.getElementById('helmetDetected');
const violationsEl = document.getElementById('violations');
const statusEl = document.getElementById('status');
const listEl = document.getElementById('violationsList');

// Driver Identity elements
const idPlateImage = document.getElementById('idPlateImage');
const btnReadIdPlate = document.getElementById('btnReadIdPlate');
const btnClearIdPlate = document.getElementById('btnClearIdPlate');
const idPlateCanvas = document.getElementById('idPlateCanvas');
const idPlateTextEl = document.getElementById('idPlateText');
const idPlateStatusEl = document.getElementById('idPlateStatus');
// Drag & drop tiles and previews
const violationDrop = document.getElementById('violationDrop');
const idPlateDrop = document.getElementById('idPlateDrop');
const violationPreview = document.getElementById('violationPreview');
const idPlatePreview = document.getElementById('idPlatePreview');
const btnCancel = document.getElementById('btnCancel');
let hasViolationImage = false;

let cocoModel = null;
let processed = null;
let idPlateOverride = null; // when set, overrides detected plate when saving

const API_BASE = 'http://localhost:4000';

function setStatus(text){ statusEl.textContent = text; }

// Helpers for DnD
function preventDefaults(e){ e.preventDefault(); e.stopPropagation(); }
function wireTile(tileEl, inputEl, onFile){
  if(!tileEl || !inputEl) return;
  ['dragenter','dragover','dragleave','drop'].forEach(ev=> tileEl.addEventListener(ev, preventDefaults));
  tileEl.addEventListener('click', ()=> inputEl.click());
  tileEl.addEventListener('drop', async (e)=>{
    const dt = e.dataTransfer; const file = dt?.files?.[0]; if(!file) return;
    await onFile(file);
  });
}
async function handleViolationFile(file){
  const bmp = await createImageBitmap(file);
  canvas.width = bmp.width; canvas.height = bmp.height; ctx.drawImage(bmp,0,0);
  if(violationPreview){ violationPreview.src = canvas.toDataURL('image/jpeg',0.9); violationPreview.classList.remove('hidden'); }
  hasViolationImage = true;
  btnProcess.disabled = false;
  // Reset ID override so new images default to their own OCR unless admin re-reads ID tile
  idPlateOverride = null;
  if(idPlateTextEl) idPlateTextEl.textContent = '-';
  setIdStatus('');
}
async function handleIdPlateFile(file){
  const bmp = await createImageBitmap(file);
  if(!idPlateCanvas) return;
  idPlateCanvas.width = bmp.width; idPlateCanvas.height = bmp.height; idPlateCanvas.getContext('2d').drawImage(bmp,0,0);
  if(idPlatePreview){ idPlatePreview.src = idPlateCanvas.toDataURL('image/jpeg',0.9); idPlatePreview.classList.remove('hidden'); }
  setIdStatus('Plate image loaded. Click Read Plate.');
}

// Wire tiles after DOM is ready (file inputs already queried)
// Add dragover styling
function addHoverStyle(tile){ if(!tile) return; ['dragenter','dragover'].forEach(e=>tile.addEventListener(e, ()=> tile.classList.add('hover'))); ['dragleave','drop'].forEach(e=>tile.addEventListener(e, ()=> tile.classList.remove('hover'))); }
wireTile(violationDrop, imageInput, handleViolationFile);
wireTile(idPlateDrop, idPlateImage, handleIdPlateFile);
addHoverStyle(violationDrop); addHoverStyle(idPlateDrop);

// Cancel resets state
btnCancel?.addEventListener('click', ()=>{
  // Clear canvases and previews
  canvas.width = canvas.width; // reset
  if(violationPreview){ violationPreview.src=''; violationPreview.classList.add('hidden'); }
  if(idPlateCanvas){ idPlateCanvas.width = idPlateCanvas.width; }
  if(idPlatePreview){ idPlatePreview.src=''; idPlatePreview.classList.add('hidden'); }
  // Clear UI values
  plateTextEl.textContent = '-';
  riderCountEl.textContent = '-';
  helmetDetectedEl.textContent = '-';
  violationsEl.textContent = '-';
  processed = null;
  idPlateOverride = null;
  if(idPlateTextEl) idPlateTextEl.textContent = '-';
  setStatus(''); setIdStatus('');
  hasViolationImage = false;
  btnProcess.disabled = true;
});
function setIdStatus(text){ if(idPlateStatusEl) idPlateStatusEl.textContent = text; }

btnSignIn.addEventListener('click', async ()=>{
  try{ await window.firebaseAuth.signInWithGoogle(); }catch(e){ alert(e.message); }
});

// Identity plate upload handling
idPlateImage?.addEventListener('change', async (e)=>{
  const file = e.target.files?.[0];
  if(!file || !idPlateCanvas) return;
  const bmp = await createImageBitmap(file);
  idPlateCanvas.width = bmp.width; idPlateCanvas.height = bmp.height; idPlateCanvas.getContext('2d').drawImage(bmp,0,0);
  if(idPlatePreview){ idPlatePreview.src = idPlateCanvas.toDataURL('image/jpeg',0.9); idPlatePreview.classList.remove('hidden'); }
  setIdStatus('Plate image loaded. Click Read Plate.');
});

btnReadIdPlate?.addEventListener('click', async ()=>{
  try{
    if(!idPlateCanvas?.width || !idPlateCanvas?.height){ return alert('Upload an identity plate image first'); }
    setIdStatus('Reading plate number…');
    const { data: { text } } = await Tesseract.recognize(idPlateCanvas, 'eng', { tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-' });
    const plate = (text || '').replace(/\s+/g,'').toUpperCase();
    idPlateOverride = plate || null;
    idPlateTextEl.textContent = plate || '-';
    setIdStatus(plate ? `Detected: ${plate}` : 'Could not read plate');
  }catch(e){ setIdStatus('OCR failed: '+e.message); }
});

btnClearIdPlate?.addEventListener('click', ()=>{
  idPlateOverride = null;
  if(idPlateTextEl) idPlateTextEl.textContent = '-';
  if(idPlatePreview){ idPlatePreview.src=''; idPlatePreview.classList.add('hidden'); }
  setIdStatus('Cleared.');
});
btnSignOut?.addEventListener('click', async ()=>{
  try{
    const ok = confirm('Are you sure you want to sign out?');
    if(!ok) return;
    await window.firebaseAuth.signOut();
    window.location.href = './landing.html';
  }catch(e){ alert(e.message); }
});

window.firebaseAuth.auth.onAuthStateChanged(u=>{
  if(u){
    btnSignIn.classList.add('hidden');
    userInfo.classList.remove('hidden');
    userName.textContent = u.displayName || u.email;
    userAvatar.src = u.photoURL || '';
    btnProcess.disabled = false;
    btnSave.disabled = false;
  } else {
    btnSignIn.classList.remove('hidden');
    userInfo.classList.add('hidden');
    btnProcess.disabled = true;
    btnSave.disabled = true;
  }
});

imageInput.addEventListener('change', async (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  const bmp = await createImageBitmap(file);
  canvas.width = bmp.width; canvas.height = bmp.height; ctx.drawImage(bmp,0,0);
  if(violationPreview){ violationPreview.src = canvas.toDataURL('image/jpeg',0.9); violationPreview.classList.remove('hidden'); }
  hasViolationImage = true;
  btnProcess.disabled = false;
  // Reset ID override on new scene image
  idPlateOverride = null;
  if(idPlateTextEl) idPlateTextEl.textContent = '-';
  setIdStatus('');
});

btnCamera?.addEventListener('click', async ()=>{
  try{
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.classList.remove('hidden');
    video.srcObject = stream;
    await video.play();
    captureVideoFrame();
  }catch(e){ alert('Camera not available: '+e.message); }
});

function captureVideoFrame(){
  if(video.videoWidth && video.videoHeight){
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
  }
  requestAnimationFrame(captureVideoFrame);
}

async function ensureCoco(){
  if(!cocoModel){
    setStatus('Loading detection model…');
    cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
  }
}

async function runOCR(image){
  setStatus('Running OCR…');
  const { data: { text } } = await Tesseract.recognize(image, 'eng', { tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-' });
  return (text || '').replace(/\s+/g,' ').trim();
}

// Extract a plausible license plate from noisy OCR text
// Strategy:
// - Uppercase and strip non A-Z0-9
// - Prefer candidates length 6-12 with a mix of letters and digits
// - Fallback to the longest alphanumeric run if nothing matches
function extractPlate(raw){
  const s = String(raw||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(!s) return '';
  // Generate all runs of A-Z0-9 with length between 6 and 12
  const runs = s.match(/[A-Z0-9]{6,12}/g) || [];
  const scored = runs.map(r=>{
    const hasL = /[A-Z]/.test(r);
    const hasD = /[0-9]/.test(r);
    // Score: prefer having both letters and digits, and closer to length 10
    const len = r.length;
    const balance = Math.abs(10 - len);
    const score = (hasL && hasD ? 100 : 0) - balance; // higher is better
    return { r, score };
  }).sort((a,b)=> b.score - a.score || b.r.length - a.r.length);
  if(scored.length) return scored[0].r;
  // Fallback to the longest run of A-Z0-9
  let best = '';
  for(const m of (s.match(/[A-Z0-9]+/g) || [])){
    if(m.length > best.length) best = m;
  }
  return best;
}

function detectHelmet(personBoxes, predictions){
  if(personBoxes.length === 0) return null;
  const motos = predictions.filter(p=>p.class==='motorcycle' && p.score>0.5);
  if(motos.length === 0) return null;
  const [mx,my,mw,mh] = motos[0].bbox;
  const riders = personBoxes.filter(p=>{
    const [x,y,w,h] = p.bbox;
    return x>mx-50 && y>my-50 && x+w < mx+mw+50 && y+h < my+mh+50;
  });
  if(riders.length === 0) return null;
  let helmetDetected = false;
  for(const person of riders){
    const [x, y, w, h] = person.bbox;
    const headHeight = h * 0.25;
    try{
      const imageData = ctx.getImageData(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(headHeight));
      const pixels = imageData.data;
      let dark=0, bright=0, colorful=0;
      for(let i=0;i<pixels.length;i+=4){
        const r=pixels[i], g=pixels[i+1], b=pixels[i+2];
        const br=(r+g+b)/3; const varc=Math.abs(r-g)+Math.abs(g-b)+Math.abs(b-r);
        if(br<80) dark++; else if(br>200) bright++; if(varc>60) colorful++;
      }
      const total=pixels.length/4;
      if(dark/total>0.4 || bright/total>0.15 || colorful/total>0.3){ helmetDetected=true; break; }
    }catch(e){ console.warn(e); }
  }
  return helmetDetected;
}

function estimateRiderCount(predictions){
  const persons = predictions.filter(p=>p.class==='person' && p.score>0.5);
  const motos = predictions.filter(p=>p.class==='motorcycle' && p.score>0.5);
  if(motos.length===0) return Math.max(0, persons.length);
  const [mx,my,mw,mh] = motos[0].bbox;
  const riders = persons.filter(p=>{ const [x,y,w,h]=p.bbox; return x>mx-50 && y>my-50 && x+w<mx+mw+50 && y+h<my+mh+50; });
  return Math.max(1, riders.length || persons.length);
}

function drawDetections(predictions){
  // Styled borders with per-class color and label background
  const colorFor = (c)=> ({
    person: '#22c55e',
    motorcycle: '#3b82f6',
    bicycle: '#06b6d4',
    car: '#f59e0b'
  }[c] || '#a78bfa');

  ctx.lineWidth = 3;
  ctx.font = '13px Inter, system-ui';
  predictions.forEach(p=>{
    const [x,y,w,h] = p.bbox;
    const col = colorFor(p.class);
    // border
    ctx.strokeStyle = col;
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 4;
    ctx.strokeRect(x,y,w,h);
    ctx.shadowBlur = 0;
    // label background
    const label = `${p.class} ${(p.score*100|0)}%`;
    const padX = 6, padY = 4;
    const textW = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(17,24,39,.9)';
    ctx.fillRect(x, y-18, textW + padX*2, 18);
    // label text
    ctx.fillStyle = '#e5e7eb';
    ctx.fillText(label, x + padX, y - 4);
  });
}

btnProcess.addEventListener('click', async ()=>{
  try{
    if(!hasViolationImage || !canvas.width || !canvas.height){
      setStatus('Please upload a violation image first.');
      return;
    }
    await ensureCoco();
    const image = canvas;
    setStatus('Detecting objects…');
    const predictions = await cocoModel.detect(image);
    ctx.drawImage(image,0,0);
    drawDetections(predictions);
    // Update the visible preview with drawn boxes
    if(violationPreview){ violationPreview.src = canvas.toDataURL('image/jpeg',0.9); violationPreview.classList.remove('hidden'); }

    const riderCount = estimateRiderCount(predictions);
    const helmetDetected = detectHelmet(predictions.filter(p=>p.class==='person'), predictions);
    const plate = await runOCR(image);
    // Extract a plausible plate string from OCR noise
    const plateClean = extractPlate(plate);

    const violationTypes = [];
    if(helmetDetected === false) violationTypes.push('NO_HELMET');
    if(riderCount > 2) violationTypes.push('OVER_CAPACITY');

    riderCountEl.textContent = String(riderCount);
    helmetDetectedEl.textContent = helmetDetected===null ? 'Unknown' : (helmetDetected ? 'Yes' : 'No');
    plateTextEl.textContent = plate || '-';
    violationsEl.textContent = violationTypes.length ? violationTypes.join(', ') : 'None';

    // Prefer the ID override only if admin read it AFTER current upload
    const finalPlate = (idPlateOverride && idPlateOverride.length>=4) ? idPlateOverride : plateClean;
    processed = { plateText: finalPlate, riderCount, helmetDetected, violationTypes, imageUrl: canvas.toDataURL('image/jpeg',0.85), metadata: { width: canvas.width, height: canvas.height } };
    setStatus('Processed. Review results below, then click Save Result to store.');
    // Scroll detection summary into view
    document.getElementById('violations')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }catch(e){ console.error(e); setStatus('Error: '+e.message); }
});

btnSave.addEventListener('click', async ()=>{
  try{
    if(!processed) return alert('Process an image first');
    const token = await window.firebaseAuth.getIdToken(); if(!token) return alert('Sign in first');
    setStatus('Saving…');
    await axios.post(`${API_BASE}/api/violations`, processed, { headers: { Authorization: `Bearer ${token}` } });
    setStatus('Saved');
  }catch(e){ setStatus('Save failed: '+e.message); }
});

btnFetch.addEventListener('click', async ()=>{
  try{
    const token = await window.firebaseAuth.getIdToken(); if(!token) return alert('Sign in first');
    setStatus('Fetching…');
    const res = await axios.get(`${API_BASE}/api/violations`, { headers: { Authorization: `Bearer ${token}` } });
    renderList(res.data||[]); setStatus('');
  }catch(e){ setStatus('Fetch failed: '+e.message); }
});

function renderList(items){
  listEl.innerHTML = '';
  items.forEach(v=>{
    const div = document.createElement('div'); div.className='card';
    div.innerHTML = `
      <div><strong>Plate:</strong> ${v.plateText||'-'}</div>
      <div><strong>Riders:</strong> ${v.riderCount??'-'}</div>
      <div><strong>Helmet:</strong> ${v.helmetDetected===null?'Unknown':(v.helmetDetected?'Yes':'No')}</div>
      <div><strong>Violations:</strong> ${(v.violationTypes||[]).join(', ')||'None'}</div>
      <div><strong>Assigned To:</strong> ${v.ownerUserId? v.ownerUserId : 'Unassigned'}</div>
      <div style="margin-top:6px;display:flex;gap:8px;align-items:center;">
        ${v.imageUrl ? `<img src="${v.imageUrl}" alt="snap" style="width:140px;border-radius:6px;border:1px solid #1f2937;"/>` : ''}
        <span class="label">${new Date(v.createdAt).toLocaleString()}</span>
      </div>`;
    listEl.appendChild(div);
  });
}
