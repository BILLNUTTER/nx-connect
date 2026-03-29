let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}

function note(
  ctx: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  volume = 0.15,
  type: OscillatorType = "sine",
  freqEnd?: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + startAt + duration * 0.9);
  }

  gain.gain.setValueAtTime(0.0001, ctx.currentTime + startAt);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + duration);

  osc.start(ctx.currentTime + startAt);
  osc.stop(ctx.currentTime + startAt + duration + 0.01);
}

/* ── Message received — soft two-note descending chime ── */
export function playMessageReceived() {
  try {
    const ctx = getCtx();
    note(ctx, 1046, 0,    0.22, 0.13);
    note(ctx, 880,  0.14, 0.28, 0.10);
  } catch { /* ignore */ }
}

/* ── Notification — three-note ascending bell ── */
export function playNotification() {
  try {
    const ctx = getCtx();
    note(ctx, 659,  0,    0.16, 0.14);
    note(ctx, 880,  0.13, 0.16, 0.12);
    note(ctx, 1047, 0.26, 0.26, 0.10);
  } catch { /* ignore */ }
}

/* ── Like — satisfying pop/bubble burst ── */
export function playLike() {
  try {
    const ctx = getCtx();
    note(ctx, 520, 0,    0.06, 0.20, "triangle", 900);
    note(ctx, 900, 0.04, 0.14, 0.10, "sine");
  } catch { /* ignore */ }
}

/* ── Message sent — quick rising swish ── */
export function playMessageSent() {
  try {
    const ctx = getCtx();
    note(ctx, 380, 0, 0.16, 0.14, "sine", 760);
  } catch { /* ignore */ }
}

/* ── Comment sent — double tick ── */
export function playCommentSent() {
  try {
    const ctx = getCtx();
    note(ctx, 700, 0,    0.07, 0.13, "sine", 900);
    note(ctx, 900, 0.09, 0.10, 0.09, "sine");
  } catch { /* ignore */ }
}
