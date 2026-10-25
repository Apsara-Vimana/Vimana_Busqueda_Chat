/* =========================================================
   Vimana Music - Sistema de Reproducción Continuo y Menús (w.js)
   ========================================================= */

// Lista Maestra de Álbumes y Pistas
const PLAYLIST_DATA = [
  {
    albumId: 'ananda',
    albumTitle: 'Ananda',
    cover: 'VimanaMusic2_files/SatChitAnanda_mo_p.png',
    folder: 'ANANDA/',
    tracks: [
      { num: 1, file: '1.mp3', title: 'Sat Chit Ananda - Inglés', artist: 'Vimana' },
      { num: 2, file: '2.mp3', title: 'Sat Chit Ananda Dicha Suprema', artist: 'Vimana' },
      { num: 3, file: '3.mp3', title: 'De la Tercera a 5ª Dimensión + 5ª Frecuencia', artist: 'Vimana' },
      { num: 4, file: '4.mp3', title: 'Aham Brahmasmi', artist: 'Vimana' },
      { num: 5, file: '5.mp3', title: 'Sat Chit Ananda - Español', artist: 'Vimana' },
      { num: 6, file: '6.mp3', title: 'Shivo Ham, Uno con El Supremo', artist: 'Vimana' },
      { num: 7, file: '7.mp3', title: 'Ayam Atma Brahma', artist: 'Vimana' },
      { num: 8, file: '8.mp3', title: 'Despertamos al Amanecer Dorado', artist: 'Vimana' },
      { num: 9, file: '9.mp3', title: 'Nueva Era Dorada - El Retorno 1', artist: 'Vimana' },
      { num: 10, file: '10.mp3', title: 'Nueva Era Dorada - El Retorno 2', artist: 'Vimana' }
    ]
  },
  {
    albumId: 'divinaversum',
    albumTitle: 'Divinaversum',
    cover: 'VimanaMusic2_files/divinaversum-cuadrada_mo_p.png',
    folder: 'unmundounafamilia/',
    tracks: [
      { num: 1, file: '01.mp3', title: 'Un mundo una familia somos uno', artist: 'Divinaversum' },
      { num: 2, file: '02.mp3', title: 'One world one family, juntos brillamos mas', artist: 'Era Dorada Gracia Celestial' },
      { num: 3, file: '03.mp3', title: 'Lokah samastah sukhino bhavantu', artist: 'One World One Family' },
      { num: 4, file: '04.mp3', title: 'Un mundo una familia valores y cualidades divinos', artist: 'Divinaversum' },
      { num: 5, file: '05.mp3', title: 'Los cantos sagrados nos unen en armonia', artist: 'Era Dorada Gracia Celestial' },
      { num: 6, file: '06.mp3', title: 'Somos uno con la luz divina', artist: 'One World One Family' },
      { num: 7, file: '07.mp3', title: 'Despertamos juntos al amanecer dorado', artist: 'Divinaversum' },
      { num: 8, file: '08.mp3', title: 'Unidos en amor', artist: 'Era Dorada Gracia Celestial' },
      { num: 9, file: '09.mp3', title: 'En mi corazon tu gracia vivira', artist: 'One World One Family' },
      { num: 10, file: '10.mp3', title: 'El Salvador luz de naciones', artist: 'Divinaversum' },
      { num: 11, file: '11.mp3', title: 'Respira Paz La Nueva Tierra', artist: 'Divinaversum' },
      { num: 12, file: '12.mp3', title: 'Amanecer Un Mundo Una Familia', artist: 'Divinaversum' }
    ]
  },
  {
    albumId: 'soham',
    albumTitle: 'Soham',
    cover: 'VimanaMusic2_files/sohan_mo_p.jpg',
    folder: 'SOHAM2026/',
    tracks: [
      { num: 1, file: '1.mp3', title: 'So Ham', artist: 'Soham America' },
      { num: 2, file: '2.mp3', title: 'Soy la forma de la paz', artist: 'Soham America' },
      { num: 3, file: '3.mp3', title: 'Sri Ram, Jey Jey Sai Ram Luz del Nuevo Sol', artist: 'Soham America' },
      { num: 4, file: '4.mp3', title: 'Brahma Murari Tripurantakari', artist: 'Soham America' },
      { num: 5, file: '5.mp3', title: 'Somos Uno (Cantos Eternos de Paz y Amor)', artist: 'Soham America' },
      { num: 6, file: '6.mp3', title: 'Om Sri Laksmy Kuvera Namaha', artist: 'Soham America' },
      { num: 7, file: '7.mp3', title: 'Guru Purnima', artist: 'Soham America' }
    ]
  }
];

// Array plano de reproducción global
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
  initDropdownMenus();
  initYoutubeModal();
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
  audio.src = track.src + '?v=' + new Date().getTime();
  audio.load();

  document.getElementById('player-cover').src = track.cover;
  document.getElementById('player-title').textContent = track.title;
  document.getElementById('player-artist').textContent = track.artist + ' • ' + track.albumTitle;
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
  const buttons = document.querySelectorAll('[data-track-index]');
  buttons.forEach((btn) => {
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

function updateTrackHighlight() {
  document.querySelectorAll('[data-track-index]').forEach((btn) => {
    const idx = parseInt(btn.getAttribute('data-track-index'), 10);
    const parentRow = btn.closest('.track-row');
    if (idx === currentIndex) {
      if (parentRow) parentRow.classList.add('bg-accent');
    } else {
      if (parentRow) parentRow.classList.remove('bg-accent');
    }
  });
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function initDropdownMenus() {
  const navButtons = document.querySelectorAll('nav .menu-dropdown-btn');
  navButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = btn.parentElement;
      const isOpen = parent.classList.contains('open');
      closeAllDropdowns();
      if (!isOpen) {
        parent.classList.add('open');
      }
    });
  });

  document.addEventListener('click', closeAllDropdowns);
}

function closeAllDropdowns() {
  document.querySelectorAll('nav .menu-dropdown-container').forEach((el) => {
    el.classList.remove('open');
  });
}

function initYoutubeModal() {
  const modal = document.getElementById('yt-modal');
  const iframe = document.getElementById('yt-iframe');
  const closeBtn = document.getElementById('yt-modal-close');

  document.querySelectorAll('[data-yt-url], [data-yt-id], [data-yt-playlist]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      let embedUrl = '';
      
      const ytId = link.getAttribute('data-yt-id');
      const ytPlaylist = link.getAttribute('data-yt-playlist');
      const ytUrl = link.getAttribute('data-yt-url');

      if (ytId) {
        embedUrl = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
      } else if (ytPlaylist) {
        embedUrl = `https://www.youtube.com/embed/videoseries?list=${ytPlaylist}&autoplay=1&rel=0`;
      } else if (ytUrl) {
        if (ytUrl.includes('watch?v=')) {
          const v = ytUrl.split('v=')[1].split('&')[0];
          embedUrl = `https://www.youtube.com/embed/${v}?autoplay=1&rel=0`;
        } else if (ytUrl.includes('list=')) {
          const l = ytUrl.split('list=')[1].split('&')[0];
          embedUrl = `https://www.youtube.com/embed/videoseries?list=${l}&autoplay=1&rel=0`;
        } else {
          embedUrl = ytUrl;
        }
      }

      if (embedUrl && iframe && modal) {
        iframe.src = embedUrl;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        if (!audio.paused) {
          audio.pause();
          updatePlayIcon(false);
        }
      }
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (iframe) iframe.src = '';
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (iframe) iframe.src = '';
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    });
  }
}