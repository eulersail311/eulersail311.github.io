(() => {
  'use strict';

  const tracks = {
    lighthouse: {
      title: '雾中灯塔',
      tempo: 72,
      waveform: 'triangle',
      melody: [
        62, null, 65, 69, 67, null, 65, null,
        62, 65, 69, 72, 69, null, 67, null,
        60, null, 64, 67, 65, null, 64, null,
        62, 65, 69, 67, 65, null, 62, null,
        57, 62, 65, 69, 67, 65, 62, null,
        60, 64, 67, 72, 69, 67, 65, 62
      ],
      bass: [38, 38, 41, 41, 36, 36, 38, 38, 33, 33, 36, 38],
      chords: [
        [50, 57, 62], [53, 57, 60], [48, 55, 60],
        [50, 57, 62], [45, 52, 57], [48, 55, 60]
      ]
    },
    minuet: {
      title: '雨后小步舞',
      tempo: 96,
      waveform: 'sine',
      melody: [
        67, 71, 74, 71, 69, 67, 66, 67,
        69, 72, 76, 74, 72, 69, 67, null,
        71, 74, 79, 78, 76, 74, 72, 71,
        69, 72, 76, 74, 71, 69, 67, null,
        67, 69, 71, 74, 72, 71, 69, 67,
        66, 67, 69, 66, 62, 64, 67, null
      ],
      bassEvery: 1,
      chordEvery: 3,
      bass: [
        43, 50, 50, 45, 52, 52, 47, 54, 54, 43, 50, 50,
        52, 59, 59, 50, 57, 57, 48, 55, 55, 43, 50, 43
      ],
      chords: [
        [55, 59, 62], [57, 60, 64], [59, 62, 66], [55, 59, 62],
        [52, 57, 60], [50, 57, 62], [48, 55, 60], [55, 59, 62]
      ]
    },
    voyage: {
      title: '远航',
      tempo: 84,
      waveform: 'triangle',
      melody: [
        60, 62, 64, 67, 66, 64, 62, null,
        60, 64, 67, 69, 67, 64, 62, null,
        62, 64, 67, 71, 69, 67, 64, 62,
        60, 62, 64, 67, 69, 71, 72, null,
        67, 69, 71, 74, 72, 71, 69, 67,
        64, 67, 69, 72, 71, 69, 67, 64,
        62, 64, 67, 69, 67, 64, 62, 60,
        55, 60, 64, 67, 64, 62, 60, null
      ],
      bass: [36, 43, 45, 40, 41, 48, 43, 38, 36, 43, 45, 40, 41, 43, 36, 36],
      chords: [
        [48, 55, 60], [50, 57, 62], [53, 60, 65], [52, 59, 64],
        [48, 55, 60], [45, 52, 57], [50, 57, 62], [48, 55, 60]
      ]
    },
    harbor: {
      title: '归港',
      tempo: 76,
      waveform: 'triangle',
      melody: [
        64, 67, 72, 71, 69, 67, 64, null,
        65, 69, 72, 74, 72, 69, 65, null,
        62, 65, 69, 67, 65, 64, 62, null,
        67, 71, 74, 72, 71, 69, 67, null,
        69, 72, 76, 74, 72, 69, 67, null,
        65, 69, 72, 69, 67, 65, 62, null,
        67, 71, 74, 76, 74, 71, 69, 67,
        64, 67, 72, 71, 67, 64, 60, null
      ],
      bass: [
        36, 43, 41, 48, 38, 45, 43, 50,
        45, 52, 38, 45, 43, 50, 36, 43
      ],
      chords: [
        [48, 52, 55], [53, 57, 60], [50, 53, 57], [55, 59, 62],
        [57, 60, 64], [50, 53, 57], [55, 59, 62], [48, 52, 55]
      ]
    }
  };

  let activePlayback = null;
  let volume = 0.42;

  const frequencyFor = midi => 440 * Math.pow(2, (midi - 69) / 12);

  function createVoice(context, output, midi, start, duration, options = {}) {
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const peak = options.gain || 0.08;

    oscillator.type = options.waveform || 'sine';
    oscillator.frequency.setValueAtTime(frequencyFor(midi), start);
    oscillator.detune.setValueAtTime(options.detune || 0, start);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(options.cutoff || 2400, start);
    filter.Q.setValueAtTime(0.7, start);

    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.08, duration * 0.2));
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.58), start + duration * 0.68);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect(output);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
  }

  function stopPlayback(manual = true) {
    if (!activePlayback) return;

    window.clearInterval(activePlayback.progressTimer);
    window.clearTimeout(activePlayback.finishTimer);
    activePlayback.context.close().catch(() => {});

    const button = activePlayback.button;
    button.classList.remove('is-playing');
    button.setAttribute('aria-pressed', 'false');
    button.querySelector('.music-button-label').textContent = '播放';
    button.closest('.music-track-card').style.setProperty('--track-progress', '0%');

    const message = document.querySelector('#music-studio-message');
    if (message) message.textContent = manual ? '播放已停止' : `${activePlayback.title} · 播放完成`;
    activePlayback = null;
  }

  function playTrack(button, trackKey) {
    const track = tracks[trackKey];
    if (!track) return;

    if (activePlayback && activePlayback.button === button) {
      stopPlayback(true);
      return;
    }
    stopPlayback(false);

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const message = document.querySelector('#music-studio-message');
    if (!AudioContextClass) {
      if (message) message.textContent = '当前浏览器不支持 Web Audio API';
      return;
    }

    const context = new AudioContextClass();
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    master.gain.setValueAtTime(volume, context.currentTime);
    master.connect(compressor);
    compressor.connect(context.destination);

    const beat = 60 / track.tempo;
    const start = context.currentTime + 0.09;
    const melodyStep = beat / 2;
    const totalDuration = track.melody.length * melodyStep;

    track.melody.forEach((midi, index) => {
      if (midi === null) return;
      createVoice(context, master, midi, start + index * melodyStep, melodyStep * 0.9, {
        waveform: track.waveform,
        gain: 0.095,
        cutoff: 2900
      });
    });

    const bassEvery = track.bassEvery || 2;
    const chordEvery = track.chordEvery || 4;

    track.bass.forEach((midi, index) => {
      createVoice(context, master, midi, start + index * beat * bassEvery, beat * bassEvery * 0.82, {
        waveform: 'sine',
        gain: 0.07,
        cutoff: 900
      });
    });

    track.chords.forEach((chord, index) => {
      chord.forEach((midi, voiceIndex) => {
        createVoice(context, master, midi, start + index * beat * chordEvery, beat * chordEvery * 0.91, {
          waveform: 'triangle',
          gain: 0.025,
          cutoff: 1500,
          detune: (voiceIndex - 1) * 2
        });
      });
    });

    button.classList.add('is-playing');
    button.setAttribute('aria-pressed', 'true');
    button.querySelector('.music-button-label').textContent = '停止';
    if (message) message.textContent = `${track.title} · 正在浏览器中即时合成`;

    const card = button.closest('.music-track-card');
    const startedAt = performance.now();
    const progressTimer = window.setInterval(() => {
      const elapsed = (performance.now() - startedAt) / 1000;
      const progress = Math.min(100, (elapsed / totalDuration) * 100);
      card.style.setProperty('--track-progress', `${progress}%`);
    }, 100);

    const finishTimer = window.setTimeout(() => stopPlayback(false), totalDuration * 1000 + 220);
    activePlayback = { context, master, button, title: track.title, progressTimer, finishTimer };
  }

  function initializeMusicStudio() {
    const studio = document.querySelector('.music-studio');
    if (!studio) return;

    studio.querySelectorAll('.music-play').forEach(button => {
      button.addEventListener('click', () => playTrack(button, button.dataset.track));
    });

    const volumeInput = studio.querySelector('.music-volume');
    if (volumeInput) {
      volume = Number(volumeInput.value);
      volumeInput.addEventListener('input', event => {
        volume = Number(event.target.value);
        if (activePlayback) {
          const now = activePlayback.context.currentTime;
          activePlayback.master.gain.setTargetAtTime(volume, now, 0.04);
          const message = document.querySelector('#music-studio-message');
          if (message) message.textContent = `音量已调整为 ${Math.round(volume * 100)}%`;
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMusicStudio);
  } else {
    initializeMusicStudio();
  }
})();
