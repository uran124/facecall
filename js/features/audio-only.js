import { toggleVideo } from '../rtc.js';

let videoEnabled = true;

const btn = document.createElement('button');
btn.id = 'audioOnlyBtn';
btn.className =
  'fixed bottom-4 right-4 bg-neutral-800 text-neutral-100 rounded-full p-3';

function render() {
  btn.textContent = videoEnabled ? '🎥' : '🎧';
  btn.title = videoEnabled ? 'Выключить видео' : 'Включить видео';
}

btn.addEventListener('click', () => {
  videoEnabled = !videoEnabled;
  toggleVideo(videoEnabled);
  render();
});

render();
document.body.appendChild(btn);

