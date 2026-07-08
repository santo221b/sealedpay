/**
 * A two-note chime for the delivered moment — synthesized, so no audio asset
 * ships with the widget. Failure here must never surface: sound is a nicety.
 */
export function playSuccessChime() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const note = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration + 0.05);
    };
    note(523.25, 0, 0.35); // C5
    note(783.99, 0.12, 0.5); // G5
    window.setTimeout(() => void ctx.close(), 1200);
  } catch {
    /* never let sound break a payout */
  }
}
