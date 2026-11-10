// Web Audio API tick sound generator
class SoundFX {
  private ctx: AudioContext | null = null;
  private enabled: boolean = false;

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (val && !this.ctx) {
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioContextClass();
      } catch {
        // audio context not available or blocked
      }
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public playTick(direction: 'up' | 'down' | 'neutral') {
    if (!this.enabled || direction === 'neutral') return;
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioContextClass();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = direction === 'up' ? 880 : 440;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(direction === 'up' ? 1200 : 320, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // Audio playback fails silently in restricted iframe contexts
    }
  }
}

export const soundManager = new SoundFX();
