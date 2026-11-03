export class Sounds {
  constructor() { this.ctx = null; this.enabled = true; }
  unlock() {
    if (!this.enabled) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try { this.ctx ??= new Audio(); if (this.ctx.state === 'suspended') void this.ctx.resume(); } catch { /* unsupported */ }
  }
  tone(freq, duration, type = 'sine', volume = 0.12, delay = 0) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.001, t); gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t); osc.stop(t + duration + 0.01);
  }
  shoot() { this.tone(130, 0.075, 'triangle', 0.07); }
  hit(reward) {
    this.tone(reward.perfect ? 680 : 480, 0.19, 'sine', 0.12);
    this.tone(reward.perfect ? 1020 : 780, 0.29, 'sine', 0.07, 0.025);
    if (reward.save) this.tone(880, 0.25, 'triangle', 0.04, 0.09);
  }
  break() {
    for (let i = 0; i < 5; i++) this.tone(620 + i * 167, 0.14 + i * 0.035, 'sawtooth', 0.026, i * 0.025);
  }
  toggle() { this.enabled = !this.enabled; if (this.enabled) this.unlock(); return this.enabled; }
}
