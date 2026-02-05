let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export function playClickSound(isMuted: boolean, letterIndex: number = 0) {
  if (isMuted) return;

  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  const baseFrequency = 700;
  const pitchStep = 50;
  osc.frequency.value = baseFrequency + (letterIndex * pitchStep);
  osc.type = 'sine';

  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.05);
}

export function playSuccessSound(isMuted: boolean, wordLength: number) {
  if (isMuted) return;

  const ctx = getAudioContext();

  if (wordLength >= 7) {
    playLongWordSound(ctx);
  } else {
    playShortSuccessSound(ctx);
  }
}

function playShortSuccessSound(ctx: AudioContext) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.frequency.value = 523.25;
  osc2.frequency.value = 659.25;
  osc1.type = 'sine';
  osc2.type = 'sine';

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime + 0.05);
  osc1.stop(ctx.currentTime + 0.2);
  osc2.stop(ctx.currentTime + 0.25);
}

function playLongWordSound(ctx: AudioContext) {
  const frequencies = [523.25, 659.25, 783.99, 1046.50];

  frequencies.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = freq;
    osc.type = 'sine';

    const startTime = ctx.currentTime + (index * 0.06);
    gain.gain.setValueAtTime(0.12, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

    osc.start(startTime);
    osc.stop(startTime + 0.15);
  });
}

export function playInvalidWordSound(isMuted: boolean) {
  if (isMuted) return;

  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);
  osc.type = 'sawtooth';

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}

export function playDuplicateWordSound(isMuted: boolean) {
  if (isMuted) return;

  const ctx = getAudioContext();
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.frequency.value = 300;
  osc2.frequency.value = 250;
  osc1.type = 'square';
  osc2.type = 'square';

  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime + 0.05);
  osc1.stop(ctx.currentTime + 0.15);
  osc2.stop(ctx.currentTime + 0.2);
}

export function playCountdownTickSound(isMuted: boolean) {
  if (isMuted) return;

  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.value = 800;
  osc.type = 'sine';

  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

export function playCountdownStartSound(isMuted: boolean) {
  if (isMuted) return;

  const ctx = getAudioContext();

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const osc3 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.connect(gain);
  osc2.connect(gain);
  osc3.connect(gain);
  gain.connect(ctx.destination);

  osc1.frequency.value = 523.25;
  osc2.frequency.value = 659.25;
  osc3.frequency.value = 783.99;
  osc1.type = 'sine';
  osc2.type = 'sine';
  osc3.type = 'sine';

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime + 0.05);
  osc3.start(ctx.currentTime + 0.1);
  osc1.stop(ctx.currentTime + 0.3);
  osc2.stop(ctx.currentTime + 0.3);
  osc3.stop(ctx.currentTime + 0.3);
}

export function playFinalSecondTick(isMuted: boolean, secondsRemaining: number) {
  if (isMuted) return;

  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  const baseFreq = 600;
  const pitchIncrease = (6 - secondsRemaining) * 100;
  osc.frequency.value = baseFreq + pitchIncrease;
  osc.type = 'sine';

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.12);
}
