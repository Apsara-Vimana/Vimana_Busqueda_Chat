/* =========================================================
   Vimana Music - Sistema de Reproducción para Podcasts (x.js)
   ========================================================= */

const PLAYLIST_DATA = [
  {
    albumId: 'podcasts',
    albumTitle: 'Podcasts Vimana',
    cover: './podcast_files/vimana-logo_mo_p.png',
    folder: 'PODCAST/',
    tracks: [
      { num: 1, file: 'VIMANA1.mp3', title: 'Conexión', artist: 'Podcasts Vimana' },
      { num: 2, file: 'VIMANA2.mp3', title: 'Maha Shivaratri', artist: 'Podcasts Vimana' },
      { num: 3, file: 'VIMANA3.mp3', title: 'Derrumbe de Paradigmas Despertar - era de acuario', artist: 'Podcasts Vimana' },
      { num: 4, file: 'VIMANA4.mp3', title: 'La verdadera revolución es interna -El gran reset', artist: 'Podcasts Vimana' },
      { num: 5, file: 'VIMANA5.mp3', title: 'La Verdad Te Libera - Inmortales En La Verdad', artist: 'Podcasts Vimana' },
      { num: 6, file: 'VIMANA6.mp3', title: 'Manifestacion Divina - Super Inteligencia', artist: 'Podcasts Vimana' },
      { num: 7, file: 'VIMANA7.mp3', title: 'Deja de Curarte', artist: 'Podcasts Vimana' },
      { num: 8, file: 'VIMANA8.mp3', title: 'Del Quantum al Purana', artist: 'Podcasts Vimana' },
      { num: 9, file: 'VIMANA9.mp3', title: 'Ya eres lo que buscas', artist: 'Podcasts Vimana' },
      { num: 10, file: 'VIMANA10.mp3', title: 'El Arte de la Rendición Divina', artist: 'Podcasts Vimana' },
      { num: 11, file: 'VIMANA11.mp3', title: 'Guru Purnima 2026', artist: 'Podcasts Vimana' },
      { num: 12, file: 'VIMANA12.mp3', title: 'SOL ES LA VIDA Y LA CONCIENCIA (GAYATRI)', artist: 'Podcasts Vimana' },
      { num: 13, file: 'VIMANA13.mp3', title: 'LO QUE TODOS DEBERÍAMOS SABER SOBRE NUESTRA PAZ', artist: 'Podcasts Vimana' },
      { num: 14, file: 'VIMANA14.mp3', title: '¿Quién soy cuando desaparece el \'yo\'?', artist: 'Podcasts Vimana' },
      { num: 15, file: 'VIMANA15.mp3', title: 'vimana podcast', artist: 'Podcasts Vimana' },
      { num: 16, file: 'VIMANA16.mp3', title: 'vimana podcast', artist: 'Podcasts Vimana' },
      { num: 17, file: 'VIMANA17..mp3', title: 'vimana podcast', artist: 'Podcasts Vimana' },
      { num: 18, file: 'VIMANA18.mp3', title: 'vimana podcast', artist: 'Podcasts Vimana' },
      { num: 19, file: 'VIMANA19.mp3', title: 'vimana podcast', artist: 'Podcasts Vimana' },
      { num: 20, file: 'VIMANA20.mp3', title: 'vimana podcast', artist: 'Podcasts Vimana' }
    ]
  }
];

let FLAT_PLAYLIST = [];
PLAYLIST_DATA.forEach((album) => {
  album.tracks.forEach((track) => {
    FLAT_PLAYLIST.push({
      src: album.folder + track.file,
      title: track.title,
      artist: track.artist,
      cover: album.cover,
      albumTitle: album.albumTitle
    });
  });
});

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

  audio.addEventListener('ended', () => {
    nextTrack();
  });

  audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
      const pct = (audio.currentTime / audio.duration) * 100;
      progressBar.value = pct;
      currentTimeEl.textContent = formatTime(audio.currentTime);
      durationTimeEl.textContent = formatTime(audio.duration);
    }
  });

  if (progressBar) {
    progressBar.addEventListener('input', (e) => {
      if (audio.duration) {
        audio.currentTime = (e.target.value / 100) * audio.duration;
      }
    });
  }

  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      audio.volume = e.target.value;
    });
  }

  if (playBtn) playBtn.addEventListener('click', togglePlay);
  if (prevBtn) prevBtn.addEventListener('click', prevTrack);
  if (nextBtn) nextBtn.addEventListener('click', nextTrack);
}

function loadTrack(index, autoplay = true) {
  if (index < 0 || index >= FLAT_PLAYLIST.length) return;
  const track = FLAT_PLAYLIST[index];

  currentIndex = index;
  audio.src = track.src;
  audio.load();

  document.getElementById('player-cover').src = track.cover;
  document.getElementById('player-title').textContent = track.title;
  document.getElementById('player-artist').textContent = track.artist;
  document.getElementById('vimana-player-bar').classList.remove('hidden');

  updateTrackHighlight();

  if (autoplay) {
    audio.play().then(() => updatePlayIcon(true)).catch(() => updatePlayIcon(false));
  }
}

function togglePlay() {
  if (!audio.src) {
    loadTrack(0, true);
    return;
  }
  if (audio.paused) {
    audio.play();
    updatePlayIcon(true);
  } else {
    audio.pause();
    updatePlayIcon(false);
  }
}

function prevTrack() {
  let prevIdx = currentIndex - 1;
  if (prevIdx < 0) prevIdx = FLAT_PLAYLIST.length - 1;
  loadTrack(prevIdx, true);
}

function nextTrack() {
  let nextIdx = currentIndex + 1;
  if (nextIdx >= FLAT_PLAYLIST.length) nextIdx = 0;
  loadTrack(nextIdx, true);
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
  const elements = document.querySelectorAll('[data-track-index]');
  elements.forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const attr = el.getAttribute('data-track-index');
      if (attr === null) return;
      const idx = parseInt(attr, 10);
      if (currentIndex === idx && !audio.paused) {
        audio.pause();
        updatePlayIcon(false);
      } else {
        loadTrack(idx, true);
      }
    });
  });
}

function updateTrackHighlight() {
  document.querySelectorAll('.track-row').forEach((row) => {
    const attr = row.getAttribute('data-track-index');
    if (attr !== null) {
      const idx = parseInt(attr, 10);
      if (idx === currentIndex) {
        row.classList.add('bg-accent');
      } else {
        row.classList.remove('bg-accent');
      }
    }
  });
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}