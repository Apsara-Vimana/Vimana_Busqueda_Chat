/* =========================================================
   Vimana Music - Sistema de Reproducción Sadhana (s.js)
   ========================================================= */

const PLAYLIST_DATA = [
  {
    albumId: 'sadhana',
    albumTitle: 'Sadhana Bhajans',
    cover: 'sadhana_files/vimana-logo_mo_p_g2Aw.png',
    folder: 's100/',
    tracks: [
      { num: 1, file: '1.mp3', title: '1 bhajans', artist: 'Sadhana Vimana' },
      { num: 2, file: '2.mp3', title: '2 bhajans', artist: 'Sadhana Vimana' },
      { num: 3, file: '3.mp3', title: '3 bhajans', artist: 'Sadhana Vimana' },
      { num: 4, file: '4.mp3', title: '4 bhajans', artist: 'Sadhana Vimana' },
      { num: 5, file: '5.mp3', title: '5 bhajans', artist: 'Sadhana Vimana' },
      { num: 6, file: '6.mp3', title: '6 bhajans', artist: 'Sadhana Vimana' },
      { num: 7, file: '7.mp3', title: '7 bhajans', artist: 'Sadhana Vimana' },
      { num: 8, file: '8.mp3', title: '8 bhajans', artist: 'Sadhana Vimana' },
      { num: 9, file: '9.mp3', title: '9 bhajans', artist: 'Sadhana Vimana' },
      { num: 10, file: '10.mp3', title: '10 bhajans', artist: 'Sadhana Vimana' }
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