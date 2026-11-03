import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const API_BASE = 'http://localhost:3000';
const MIN_INTERVAL = 1500;
const GESTOS_PERMITIDOS = ['aberta', 'fechada', 'positivo'];

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

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
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-assets/hand_landmarker.task'
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
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, frameRate: 30 } })
      .then(stream => {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
          // Wait for valid video dimensions
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          } else {
            // Fallback: set a reasonable default
            canvas.width = 640;
            canvas.height = 480;
          }
          resolve();
        };
        // Handle case where video already has dimensions
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          video.onloadedmetadata();
        }
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
  const wrist = landmarks[0];
  const d = i => Math.hypot(landmarks[i].x - wrist.x, landmarks[i].y - wrist.y);

  const indexExtended = d(8) > d(6) * 1.05;
  const middleExtended = d(12) > d(10) * 1.05;
  const ringExtended = d(16) > d(14) * 1.05;
  const pinkyExtended = d(20) > d(18) * 1.05;
  const thumbExtended = d(4) > d(3) * 1.15;

  const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

  if (extendedCount === 0 && !thumbExtended) return 'fechada';
  if (extendedCount === 0 && thumbExtended) return 'positivo';
  if (extendedCount >= 4) return 'aberta';
  if (extendedCount >= 3 && thumbExtended) return 'aberta';
  return null;
}

function drawLandmarks(landmarks) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Espelha o eixo X para alinhar com o video (que usa transform: scaleX(-1))
  const toXY = lm => ({
    x: (1 - lm.x) * canvas.width,
    y: lm.y * canvas.height
  });

  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 3;
  for (const [a, b] of HAND_CONNECTIONS) {
    const p1 = toXY(landmarks[a]);
    const p2 = toXY(landmarks[b]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  for (let i = 0; i < landmarks.length; i++) {
    const p = toXY(landmarks[i]);
    ctx.fillStyle = (i % 4 === 0) ? '#f59e0b' : '#2563eb';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
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

let lastVideoTime = -1;

function processVideo() {
  if (!isRunning || !handLandmarker) return;

  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const now = performance.now();
    let result = null;
    try {
      // A API tasks-vision retorna o resultado de forma sincrona (sem callback)
      result = handLandmarker.detectForVideo(video, now);
    } catch (err) {
      console.error(err);
      animationId = requestAnimationFrame(processVideo);
      return;
    }

    if (result && result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];
      drawLandmarks(landmarks);
      const gesture = classifyGesture(landmarks);
      if (gesture) {
        handleGesture(gesture);
      } else {
        lastGesture = null;
        setStatus('procurando', 'Mão detectada — gesto não reconhecido');
      }
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      lastGesture = null;
      setStatus('procurando', 'Nenhuma mão detectada');
    }
  }
  animationId = requestAnimationFrame(processVideo);
}

btnStart.addEventListener('click', async () => {
  clearError();
  btnStart.disabled = true;
  btnStop.disabled = false;
  try {
    await startCamera();
    await initMediaPipe();
    isRunning = true;
    // Wait for video to have valid dimensions and be ready
    let attempts = 0;
    while (video.videoWidth === 0 && video.videoHeight === 0 && video.readyState < 2 && attempts < 100) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    processVideo();
    await loadHistory();
    setStatus('procurando', 'Detectando mão...');
  } catch (err) {
    console.error(err);
    if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
      setStatus('erro', 'Permissão de câmera negada');
      setError('Por favor, conceda permissão de câmera nas configurações do navegador.');
    } else if (err.name === 'OverconstrainedError') {
      setStatus('erro', 'Câmera não disponível');
      setError('Sua câmera não suporta as configurações solicitadas. Tente recarregar a página.');
    } else {
      setStatus('erro', 'Câmera indisponível');
      setError('Erro ao iniciar câmera: ' + err.message);
    }
    btnStart.disabled = false;
    btnStop.disabled = true;
  }
});

btnStop.addEventListener('click', stopCamera);

window.addEventListener('beforeunload', stopCamera);
