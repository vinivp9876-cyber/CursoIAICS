import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const API_BASE = 'http://localhost:3000';
const MIN_INTERVAL = 1500;
const GESTOS_PERMITIDOS = ['aberta', 'fechada', 'positivo'];

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const statusEl = document.getElementById('status');
const errorEl = document.getElementById('error');
const lastGestureEl = document.getElementById('last-gesture');
const counterAberta = document.getElementById('counter-aberta');
const counterFechada = document.getElementById('counter-fechada');
const counterPositivo = document.getElementById('counter-positivo');
const historyList = document.getElementById('history-list');

let handLandmarker = null;
let isRunning = false;
let animationId = null;
let lastGesture = null;
let lastRegisterTime = 0;
const counts = { aberta: 0, fechada: 0, positivo: 0 };

function setStatus(kind, text) {
  statusEl.textContent = text;
  statusEl.className = 'status-badge ' + kind;
}
function setError(text) {
  errorEl.textContent = text;
}
function clearError() {
  errorEl.textContent = '';
}

async function initMediaPipe() {
  try {
    setStatus('procurando', 'Carregando modelo...');
    const filesetResolver = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
    );
    handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/float16/1/hand_landmarker.tflite'
      },
      runningMode: 'VIDEO',
      numHands: 1
    });
    setStatus('aguardando', 'Aguardando mão');
  } catch (err) {
    console.error(err);
    setStatus('erro', 'Erro ao carregar MediaPipe');
    setError('Não foi possível iniciar o modelo de detecção.');
  }
}

function startCamera() {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          resolve();
        };
      })
      .catch(err => {
        console.error(err);
        reject(err);
      });
  });
}

function stopCamera() {
  isRunning = false;
  if (animationId) cancelAnimationFrame(animationId);
  const stream = video.srcObject;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  btnStart.disabled = false;
  btnStop.disabled = true;
  lastGesture = null;
  lastRegisterTime = 0;
  setStatus('aguardando', 'Câmera parada');
}

function classifyGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;
  const y = i => landmarks[i].y;
  const x = i => landmarks[i].x;

  const indexExtended = y(8) < y(6);
  const middleExtended = y(12) < y(10);
  const ringExtended = y(16) < y(14);
  const pinkyExtended = y(20) < y(18);
  const thumbExtended = Math.abs(x(4) - x(2)) > 0.05;

  const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

  if (extendedCount >= 3 && thumbExtended) return 'aberta';
  if (extendedCount === 0 && !thumbExtended) return 'fechada';
  if (thumbExtended && extendedCount === 0) return 'positivo';
  return null;
}

function drawLandmarks(landmarks) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2563eb';
  for (const lm of landmarks) {
    const x = lm.x * canvas.width;
    const y = lm.y * canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

async function handleGesture(gesture) {
  lastGestureEl.textContent = gesture;
  const now = Date.now();
  const changed = gesture !== lastGesture;
  const intervalOk = now - lastRegisterTime >= MIN_INTERVAL;

  if (!changed && !intervalOk) return;

  lastGesture = gesture;
  lastRegisterTime = now;

  await registerGesture(gesture);
}

async function registerGesture(gesture) {
  setStatus('reconhecido', 'Gesto: ' + gesture);
  try {
    const res = await fetch(API_BASE + '/api/gestos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gesto: gesture, confianca: null })
    });
    if (!res.ok) throw new Error('Erro HTTP ' + res.status);
    counts[gesture] = (counts[gesture] || 0) + 1;
    updateCounters();
    await loadHistory();
  } catch (err) {
    console.error(err);
    setError('Não foi possível registrar o gesto no servidor.');
  }
}

function updateCounters() {
  counterAberta.textContent = counts.aberta;
  counterFechada.textContent = counts.fechada;
  counterPositivo.textContent = counts.positivo;
}

async function loadHistory() {
  try {
    const res = await fetch(API_BASE + '/api/gestos');
    if (!res.ok) throw new Error('Erro ao carregar histórico');
    const data = await res.json();
    historyList.innerHTML = '';
    for (const item of (data || []).reverse()) {
      const li = document.createElement('li');
      li.innerHTML = `<span class="gesto">${item.gesto}</span><span class="data">${new Date(item.data_hora).toLocaleString('pt-BR')}</span>`;
      historyList.appendChild(li);
    }
  } catch (err) {
    console.error(err);
    setError('Não foi possível carregar o histórico.');
  }
}

function processVideo() {
  if (!isRunning) return;
  const now = performance.now();
  handLandmarker.detectForVideo(video, now, (result) => {
    if (result.landmarks && result.landmarks.length > 0) {
      drawLandmarks(result.landmarks[0]);
      const gesture = classifyGesture(result.landmarks[0]);
      handleGesture(gesture || null);
      if (!gesture) {
        lastGesture = null;
        setStatus('procurando', 'Nenhuma mão detectada');
      }
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      lastGesture = null;
      setStatus('procurando', 'Nenhuma mão detectada');
    }
    animationId = requestAnimationFrame(processVideo);
  });
}

btnStart.addEventListener('click', async () => {
  clearError();
  try {
    btnStart.disabled = true;
    btnStop.disabled = false;
    await startCamera();
    await initMediaPipe();
    isRunning = true;
    processVideo();
    await loadHistory();
  } catch (err) {
    setStatus('erro', 'Câmera indisponível');
    setError('Permissão negada ou câmera não disponível: ' + err.message);
    btnStart.disabled = false;
    btnStop.disabled = true;
  }
});

btnStop.addEventListener('click', stopCamera);

window.addEventListener('beforeunload', stopCamera);
