/* =========================================================
   Podcast Vimana - Sistema de Reproducción (x.js)
   ========================================================= */

const PODCAST_PLAYLIST = [
  { file: "https://vimana.rf.gd/PODCAST/VIMANA1.mp3", title: "Despertar de la Mente", artist: "Podcast Vimana", cover: "./podcast_files/vimana-logo_mo_p.png" },
  { file: "https://vimana.rf.gd/PODCAST/VIMANA2.mp3", title: "Geometría del Corazón", artist: "Podcast Vimana", cover: "./podcast_files/vimana-logo_mo_p.png" },
  { file: "https://vimana.rf.gd/PODCAST/VIMANA3.mp3", title: "Expansión Consciente", artist: "Podcast Vimana", cover: "./podcast_files/vimana-logo_mo_p.png" },
  { file: "https://vimana.rf.gd/PODCAST/VIMANA4.mp3", title: "El Eco del Silencio", artist: "Podcast Vimana", cover: "./podcast_files/vimana-logo_mo_p.png" },
  { file: "https://vimana.rf.gd/PODCAST/VIMANA5.mp3", title: "Armonía Universal", artist: "Podcast Vimana", cover: "./podcast_files/vimana-logo_mo_p.png" },
  { file: "https://vimana.rf.gd/PODCAST/VIMANA6.mp3", title: "El Latido Cuántico", artist: "Podcast Vimana", cover: "./podcast_files/vimana-logo_mo_p.png" },
  { file: "https://vimana.rf.gd/PODCAST/VIMANA7.mp3", title: "Senderos del Alma", artist: "Podcast Vimana", cover: "./podcast_files/vimana-logo_mo_p.png" },
  { file: "https://vimana.rf.gd/PODCAST/VIMANA8.mp3", title: "Retorno al Origen", artist: "Podcast Vimana", cover: "./podcast_files/vimana-logo_mo_p.png" },
  { file: "https://vimana.rf.gd/PODCAST/VIMANA9.mp3", title: "Ya eres lo que buscas", artist: "Podcast Vimana", cover: "./podcast_files/vimana-logo_mo_p.png" },
  { file: "https://vimana.rf.gd/PODCAST/VIMANA10.mp3", title: "El Arte de la Rendición Divina", artist: "Podcast Vimana", cover: "./podcast_files/vimana-logo_mo_p.png" },
  { file: "https://vimana.rf.gd/PODCAST/VIMANA11.mp3", title: "Vimana Transmisión Final", artist: "Podcast Vimana", cover: "./podcast_files/vimana-logo_mo_p.png" },
  { file: "https://vimana.rf.gd/PODCAST/VIMANA12.mp3", title: "SOL ES LA VIDA Y LA CONCIENCIA Y GAYATRI", artist: "Podcast Vimana", cover: "./podcast_files/vimana-logo_mo_p.png" },
  { file: "https://vimana.rf.gd/PODCAST/VIMANA13.mp3", title: "LO QUE TODOS DEBERÍAMOS SABER SOBRE NUESTRA PAZ", artist: "Podcast Vimana", cover: "./podcast_files/vimana-logo_mo_p.png" },
  { file: "https://vimana.rf.gd/PODCAST/VIMANA14.mp3", title: "¿Quién soy cuando desaparece el 'yo'?", artist: "Podcast Vimana", cover: "./podcast_files/vimana-logo_mo_p.png" }
];

let currentIndex = 0;
let audio = new Audio();

document.addEventListener('DOMContentLoaded', () => {
  initPlayerBar();
  initTrackButtons();
});

function initPlayerBar() {
  const playBtn = document.getElementById('player-play-btn');
  const prevBtn = document.getElementById('player-prev-btn');
  const nextBtn = document.getElementById('player-next-btn');
  const progressBar = document.getElementById('player-progress-bar');
  const currentTimeEl = document.getElementById('player-current-time');
  const durationTimeEl = document.getElementById('player-duration');
  const volumeSlider = document.getElementById('player-volume');

  audio.addEventListener('ended', nextTrack);
  audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
      progressBar.value = (audio.currentTime / audio.duration) * 100;
      currentTimeEl.textContent = formatTime(audio.currentTime);
      durationTimeEl.textContent = formatTime(audio.duration);
    }
  });

  if (progressBar) {
    progressBar.addEventListener('input', (e) => {
      if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration;
    });
  }

  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => { audio.volume = e.target.value; });
  }

  if (playBtn) playBtn.addEventListener('click', togglePlay);
  if (prevBtn) prevBtn.addEventListener('click', prevTrack);
  if (nextBtn) nextBtn.addEventListener('click', nextTrack);
}

function loadTrack(index, autoplay = true) {
  if (index < 0 || index >= PODCAST_PLAYLIST.length) return;
  const track = PODCAST_PLAYLIST[index];
  currentIndex = index;
  audio.src = track.file;
  audio.load();

  document.getElementById('player-cover').src = track.cover;
  document.getElementById('player-title').textContent = track.title;
  document.getElementById('player-artist').textContent = track.artist;
  document.getElementById('vimana-player-bar').classList.remove('hidden');

  updateHighlight();
  if (autoplay) audio.play().then(() => updatePlayIcon(true)).catch(() => updatePlayIcon(false));
}

function togglePlay() {
  if (!audio.src) { loadTrack(0, true); return; }
  if (audio.paused) { audio.play(); updatePlayIcon(true); } else { audio.pause(); updatePlayIcon(false); }
}

function prevTrack() {
  let idx = currentIndex - 1;
  if (idx < 0) idx = PODCAST_PLAYLIST.length - 1;
  loadTrack(idx, true);
}

function nextTrack() {
  let idx = currentIndex + 1;
  if (idx >= PODCAST_PLAYLIST.length) idx = 0;
  loadTrack(idx, true);
}

function updatePlayIcon(isPlaying) {
  const playBtn = document.getElementById('player-play-btn');
  if (!playBtn) return;
  if (isPlaying) {
    playBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
  } else {
    playBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>`;
  }
}

function initTrackButtons() {
  document.querySelectorAll('[data-track-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-track-index'), 10);
      if (currentIndex === idx && !audio.paused) {
        audio.pause();
        updatePlayIcon(false);
      } else {
        loadTrack(idx, true);
      }
    });
  });
}

function updateHighlight() {
  document.querySelectorAll('.track-row').forEach((row, idx) => {
    if (idx === currentIndex) row.classList.add('bg-accent');
    else row.classList.remove('bg-accent');
  });
}

function formatTime(secs) {
  if (isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}