import { ICE_SERVERS } from '../config/config.js';

let pc;
let sendSignalFn;
let currentRoomId;
let reconnectTimer;

function ensureVideo(id, muted = false) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('video');
    el.id = id;
    el.autoplay = true;
    el.playsInline = true;
    if (muted) el.muted = true;
    document.getElementById('app')?.appendChild(el);
  }
  return el;
}

export function bindSignaling(fn) {
  sendSignalFn = fn;
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (currentRoomId) start(currentRoomId);
  }, 1000);
}

export async function start(roomId) {
  currentRoomId = roomId;

  if (pc) {
    pc.ontrack = null;
    pc.onicecandidate = null;
    pc.onconnectionstatechange = null;
    pc.close();
  }

  pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  pc.onicecandidate = e => {
    if (e.candidate) {
      sendSignalFn?.({ type: 'ice', data: e.candidate });
    }
  };

  pc.ontrack = ev => {
    const remoteVideo = ensureVideo('remoteVideo');
    remoteVideo.srcObject = ev.streams[0];
  };

  pc.onconnectionstatechange = () => {
    if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
      scheduleReconnect();
    }
  };

  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  });

  const localVideo = ensureVideo('localVideo', true);
  localVideo.srcObject = localStream;

  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  sendSignalFn?.({ type: 'offer', data: pc.localDescription });
}

export async function onSignal(msg, sendSignal) {
  const send = sendSignal || sendSignalFn;
  if (!pc || !msg) return;

  try {
    switch (msg.type) {
      case 'offer': {
        await pc.setRemoteDescription(msg.data);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send?.({ type: 'answer', data: pc.localDescription });
        break;
      }
      case 'answer': {
        await pc.setRemoteDescription(msg.data);
        break;
      }
      case 'ice': {
        if (msg.data) {
          await pc.addIceCandidate(msg.data);
        }
        break;
      }
    }
  } catch (e) {
    console.error('RTC signal error', e);
  }
}

