let sharedAudioCtx: AudioContext | null = null;

export function playScannerBeep(frequency = 1750, durationSec = 0.11): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume();
    }

    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, sharedAudioCtx.currentTime);
    gain.gain.setValueAtTime(0.14, sharedAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, sharedAudioCtx.currentTime + durationSec);

    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);
    osc.start();
    osc.stop(sharedAudioCtx.currentTime + durationSec);
  } catch {
    // Entornos sin dispositivo de audio o sin gesto previo del usuario
  }
}

