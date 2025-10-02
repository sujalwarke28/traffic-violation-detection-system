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

let cocoModel = null;
let currentImageBitmap = null;
let processed = null;

const API_BASE = 'http://localhost:4000';

function setStatus(text){ statusEl.textContent = text; }

btnSignIn.addEventListener('click', async ()=>{
  try{ await window.firebaseAuth.signInWithGoogle(); }catch(e){ alert(e.message); }
});
btnSignOut?.addEventListener('click', async ()=>{
  try{ await window.firebaseAuth.signOut(); }catch(e){ alert(e.message); }
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
  currentImageBitmap = bmp;
  drawBitmapToCanvas(bmp);
});

btnCamera.addEventListener('click', async ()=>{
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

function drawBitmapToCanvas(bmp){
  canvas.width = bmp.width; canvas.height = bmp.height; ctx.drawImage(bmp,0,0);
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

function detectHelmet(personBoxes, predictions){
  if(personBoxes.length === 0) return null;
  
  // Check if there are motorcycles in the scene
  const motos = predictions.filter(p=>p.class==='motorcycle' && p.score>0.5);
  if(motos.length === 0) return null; // Not relevant if no motorcycle
  
  // For each person near a motorcycle, analyze head region
  const [mx,my,mw,mh] = motos[0].bbox;
  const riders = personBoxes.filter(p=>{
    const [x,y,w,h] = p.bbox;
    return x>mx-50 && y>my-50 && x+w < mx+mw+50 && y+h < my+mh+50;
  });
  
  if(riders.length === 0) return null;
  
  // Analyze head region (top 25% of person bounding box)
  let helmetDetected = false;
  
  for(const person of riders){
    const [x, y, w, h] = person.bbox;
    const headHeight = h * 0.25;
    const headRegion = {
      x: Math.floor(x),
      y: Math.floor(y),
      w: Math.floor(w),
      h: Math.floor(headHeight)
    };
    
    // Get image data from head region
    try {
      const imageData = ctx.getImageData(headRegion.x, headRegion.y, headRegion.w, headRegion.h);
      const pixels = imageData.data;
      
      // Analyze color distribution
      let darkPixels = 0;
      let brightPixels = 0;
      let colorfulPixels = 0;
      
      for(let i = 0; i < pixels.length; i += 4){
        const r = pixels[i];
        const g = pixels[i+1];
        const b = pixels[i+2];
        const brightness = (r + g + b) / 3;
        
        // Check for dark colors (common helmet colors: black, dark blue, etc.)
        if(brightness < 80){
          darkPixels++;
        }
        // Check for bright/reflective areas (helmet shine/visor)
        else if(brightness > 200){
          brightPixels++;
        }
        
        // Check for colorful helmets (red, blue, yellow, etc.)
        const colorVariance = Math.abs(r-g) + Math.abs(g-b) + Math.abs(b-r);
        if(colorVariance > 60){
          colorfulPixels++;
        }
      }
      
      const totalPixels = pixels.length / 4;
      const darkRatio = darkPixels / totalPixels;
      const brightRatio = brightPixels / totalPixels;
      const colorRatio = colorfulPixels / totalPixels;
      
      // Heuristic: Helmet likely if:
      // - High dark pixel ratio (dark helmet) OR
      // - Moderate bright pixels (reflective surface/visor) OR
      // - High color variance (colored helmet)
      if(darkRatio > 0.4 || brightRatio > 0.15 || colorRatio > 0.3){
        helmetDetected = true;
        break;
      }
    } catch(e){
      console.warn('Error analyzing head region:', e);
    }
  }
  
  return helmetDetected;
}

function estimateRiderCount(predictions){
  const persons = predictions.filter(p=>p.class==='person' && p.score>0.5);
  const motos = predictions.filter(p=>p.class==='motorcycle' && p.score>0.5);
  // Heuristic: if any motorcycle present, riders <= persons within overlapping area
  if(motos.length===0) return Math.max(0, persons.length);
  // Simple overlap check
  const [mx,my,mw,mh] = motos[0].bbox; // x,y,w,h
  const riders = persons.filter(p=>{
    const [x,y,w,h] = p.bbox;
    return x>mx-50 && y>my-50 && x+w < mx+mw+50 && y+h < my+mh+50;
  });
  return Math.max(1, riders.length || persons.length);
}

function drawDetections(predictions){
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.font = '14px Inter';
  ctx.fillStyle = '#e5e7eb';
  predictions.forEach(p=>{
    const [x,y,w,h] = p.bbox;
    ctx.strokeRect(x,y,w,h);
    ctx.fillText(`${p.class} ${(p.score*100).toFixed(0)}%`, x+4, y+16);
  });
}

btnProcess.addEventListener('click', async ()=>{
  try{
    await ensureCoco();
    const image = canvas;
    setStatus('Detecting objects…');
    const predictions = await cocoModel.detect(image);
    ctx.drawImage(image,0,0); // reset
    drawDetections(predictions);

    const riderCount = estimateRiderCount(predictions);
    const helmetDetected = detectHelmet(predictions.filter(p=>p.class==='person'), predictions);
    const plate = await runOCR(image);

    const violationTypes = [];
    if(helmetDetected === false) violationTypes.push('NO_HELMET');
    if(riderCount > 2) violationTypes.push('OVER_CAPACITY');

    riderCountEl.textContent = String(riderCount);
    helmetDetectedEl.textContent = helmetDetected===null ? 'Unknown' : (helmetDetected ? 'Yes' : 'No');
    plateTextEl.textContent = plate || '-';
    violationsEl.textContent = violationTypes.length ? violationTypes.join(', ') : 'None';

    // capture data URL for saving
    processed = { plateText: plate, riderCount, helmetDetected, violationTypes, imageUrl: canvas.toDataURL('image/jpeg',0.85), metadata: { width: canvas.width, height: canvas.height } };
    setStatus('Done');
  }catch(e){
    console.error(e); setStatus('Error: '+e.message);
  }
});

btnSave.addEventListener('click', async ()=>{
  try{
    if(!processed) return alert('Process an image first');
    const token = await window.firebaseAuth.getIdToken();
    if(!token) return alert('Sign in first');
    setStatus('Saving…');
    const res = await axios.post(`${API_BASE}/api/violations`, processed, { headers: { Authorization: `Bearer ${token}` } });
    setStatus('Saved');
  }catch(e){ setStatus('Save failed: '+e.message); }
});

btnFetch.addEventListener('click', async ()=>{
  try{
    const token = await window.firebaseAuth.getIdToken();
    if(!token) return alert('Sign in first');
    setStatus('Fetching…');
    const res = await axios.get(`${API_BASE}/api/violations`, { headers: { Authorization: `Bearer ${token}` } });
    renderList(res.data||[]);
    setStatus('');
  }catch(e){ setStatus('Fetch failed: '+e.message); }
});

function renderList(items){
  listEl.innerHTML = '';
  items.forEach(v=>{
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div><strong>Plate:</strong> ${v.plateText||'-'}</div>
      <div><strong>Riders:</strong> ${v.riderCount??'-'}</div>
      <div><strong>Helmet:</strong> ${v.helmetDetected===null?'Unknown':(v.helmetDetected?'Yes':'No')}</div>
      <div><strong>Violations:</strong> ${(v.violationTypes||[]).join(', ')||'None'}</div>
      <div style="margin-top:6px;display:flex;gap:8px;align-items:center;">
        ${v.imageUrl ? `<img src="${v.imageUrl}" alt="snap" style="width:140px;border-radius:6px;border:1px solid #1f2937;"/>` : ''}
        <span class="label">${new Date(v.createdAt).toLocaleString()}</span>
      </div>
    `;
    listEl.appendChild(div);
  });
}


