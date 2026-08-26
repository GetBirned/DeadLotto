// Synthesized (not sampled) so there's no external audio asset to license or ship -
// a couple of short oscillator blips is plenty for a UI confirmation sound.
let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  // Browsers start an AudioContext suspended until a user gesture unlocks it - safe to
  // call resume() unconditionally, it's a no-op once already running.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

// AudioContext only unlocks in response to a user gesture. Call this from a click
// handler (even one that doesn't itself play a sound) so contexts are ready by the time
// a sound needs to play in response to a socket event instead of a direct click.
export function unlockAudio() {
  getContext()
}

// A quick upward "pop" - confirms a hero was claimed without being an intrusive sound.
export function playPickSound() {
  const audioCtx = getContext()
  if (!audioCtx) return
  const now = audioCtx.currentTime
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(560, now)
  osc.frequency.exponentialRampToValueAtTime(920, now + 0.09)
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.18, now + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start(now)
  osc.stop(now + 0.17)
}
