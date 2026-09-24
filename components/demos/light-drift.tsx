'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AudioLines, Mic } from 'lucide-react';
import { lightDefaults, type LightSettings } from './light-drift-engine';
import { createLightAgentMotion, lightAgentStates, lightAgentPresets, lightAgentInputState, type LightAgentState, type LightAgentMode } from './light-drift-agent';
import './light-drift.css';
import { createLightSoundFeedback, type LightSoundMode } from './light-drift-sound';

function LightDriftStudy() {
  const [settings, setSettings] = useState<LightSettings>({ ...lightDefaults, ...lightAgentPresets.listening });
  const [reduced, setReduced] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [agentState, setAgentState] = useState<LightAgentMode>('listening');
  const agentMotion = useRef(createLightAgentMotion());
  const [soundMode, setSoundMode] = useState<LightSoundMode>(null);
  const soundFeedback = useRef(createLightSoundFeedback());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef(settings);
  const refresh = useRef<(() => void) | null>(null);
  const id = useId();

  useEffect(() => {
    settingsRef.current = settings;
    refresh.current?.();
  }, [settings]);

  useEffect(() => {
    if (!reduced || agentState !== 'interrupted') return;
    const timer = window.setTimeout(() => {
      if (agentMotion.current.state !== 'interrupted') return;
      agentMotion.current.select('listening');
      setAgentState('listening');
      const next = { ...settingsRef.current, ...lightAgentPresets.listening };
      settingsRef.current = next;
      setSettings(next);
      refresh.current?.();
    }, 850);
    return () => window.clearTimeout(timer);
  }, [agentState, reduced]);

  useEffect(() => {
    if (!reduced || !soundMode) return;
    const timer = window.setTimeout(() => {
      soundFeedback.current.select(null);
      setSoundMode(null);
      refresh.current?.();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [reduced, soundMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let destroyed = false;
    let cleanup: (() => void) | undefined;
    import('./light-drift-engine').then(({ createLightDrift }) => {
      if (destroyed) return;
      const background = getComputedStyle(canvas).getPropertyValue('--light-drift-background').trim();
      let field: ReturnType<typeof createLightDrift>;
      try { field = createLightDrift(canvas, background); }
      catch { setUnavailable(true); return; }
      const preference = matchMedia('(prefers-reduced-motion: reduce)');
      setReduced(preference.matches);
      let visible = false, raf = 0, last = 0, time = 1.6;
      let motion = agentMotion.current.step(0);
      let sound = soundFeedback.current.step(0, preference.matches);
      const draw = () => field.render(time, settingsRef.current, motion.amplitude, sound);
      const active = () => visible && !document.hidden && !preference.matches;
      const schedule = () => {
        if (active() && !raf) raf = requestAnimationFrame(frame);
        if (!active()) { cancelAnimationFrame(raf); raf = 0; last = 0; }
      };
      function frame(now: number) {
        raf = 0;
        if (!active()) { last = 0; return; }
        const dt = last ? Math.min((now - last) / 1000, .05) : 0;
        const previousState = agentMotion.current.state;
        motion = agentMotion.current.step(dt);
        const previousSound = soundFeedback.current.mode;
        sound = soundFeedback.current.step(dt);
        if (soundFeedback.current.mode !== previousSound) setSoundMode(soundFeedback.current.mode);
        if (motion.state !== previousState) {
          setAgentState(motion.state);
          if (motion.state !== 'custom') {
            const next = { ...settingsRef.current, ...lightAgentPresets[motion.state] };
            settingsRef.current = next;
            setSettings(next);
          }
        }
        time += dt * settingsRef.current.speed * motion.speed;
        last = now;
        draw();
        schedule();
      }
      refresh.current = () => {
        motion = agentMotion.current.step(0, preference.matches);
        sound = soundFeedback.current.step(0, preference.matches);
        draw(); schedule();
      };
      const resize = new ResizeObserver(() => { field.resize(); draw(); });
      resize.observe(canvas);
      const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); });
      intersection.observe(canvas);
      const onPreference = () => { setReduced(preference.matches); refresh.current?.(); };
      const onVisibility = () => schedule();
      const onContextLost = (event: Event) => { event.preventDefault(); visible = false; schedule(); setUnavailable(true); };
      preference.addEventListener('change', onPreference);
      document.addEventListener('visibilitychange', onVisibility);
      canvas.addEventListener('webglcontextlost', onContextLost);
      field.resize();
      draw();
      cleanup = () => {
        cancelAnimationFrame(raf);
        resize.disconnect(); intersection.disconnect();
        preference.removeEventListener('change', onPreference);
        document.removeEventListener('visibilitychange', onVisibility);
        canvas.removeEventListener('webglcontextlost', onContextLost);
        refresh.current = null;
        field.dispose();
      };
    }).catch(() => { if (!destroyed) setUnavailable(true); });
    return () => { destroyed = true; cleanup?.(); };
  }, []);

  const change = (key: 'speed' | 'lift' | 'width', value: number) => {
    soundFeedback.current.select(null);
    setSoundMode(null);
    agentMotion.current.customize();
    setAgentState('custom');
    const next = { ...settingsRef.current, [key]: value };
    settingsRef.current = next;
    setSettings(next);
  };
  const selectState = (state: LightAgentState) => {
    soundFeedback.current.select(null);
    setSoundMode(null);
    agentMotion.current.select(state);
    setAgentState(state);
    const next = { ...settingsRef.current, ...lightAgentPresets[state] };
    settingsRef.current = next;
    setSettings(next);
    refresh.current?.();
  };
  const stateCaption = agentState === 'custom' ? 'Custom' : lightAgentStates.find(state => state.id === agentState)!.caption;
  const triggerSound = (mode: Exclude<LightSoundMode, null>) => {
    if (mode === 'output' && agentMotion.current.state !== 'answering') return;
    if (mode === 'input') selectState(lightAgentInputState(agentMotion.current.state));
    soundFeedback.current.select(mode);
    setSoundMode(mode);
    refresh.current?.();
  };
  const [captionTitle, captionDetail] = stateCaption.split(' · ');
  const controls = [
    { key: 'speed' as const, label: 'Flow speed', min: .2, max: 2, step: .05, value: `${settings.speed.toFixed(2)} ×` },
    { key: 'lift' as const, label: 'Fold', min: .1, max: 1, step: .01, value: `${Math.round(settings.lift * 100)}%` },
    { key: 'width' as const, label: 'Width', min: .25, max: .95, step: .01, value: `${Math.round(settings.width * 100)}%` },
  ];

  return (
    <div className="light-drift-demo">
      <div className="light-drift-surface">
        <figure className="light-drift-orb" aria-label="Flowing agent light bands over a circular dark blue background">
          <canvas ref={canvasRef} aria-hidden="true" />
          {unavailable && <div className="light-drift-fallback"><span /> <p>Live light needs WebGL. Reload to try again.</p></div>}
          <figcaption className="light-drift-status">
            <output aria-live="polite">
              <span>{unavailable ? 'Still light' : captionTitle}</span>
              {(unavailable || reduced || soundMode || captionDetail) && <span>{unavailable ? 'WebGL unavailable' : reduced ? 'Reduced motion' : soundMode ? `Simulated ${soundMode}` : captionDetail}</span>}
            </output>
          </figcaption>
        </figure>
        <fieldset className="light-drift-sound" aria-label="Simulated sound feedback">
          <button type="button" aria-label="Simulate sound input" title="You speak: interrupt the agent and return to listening" aria-pressed={soundMode === 'input'} disabled={unavailable} onClick={() => triggerSound('input')}><Mic size={12} aria-hidden="true" />{soundMode === 'input' ? 'Receiving…' : 'Sound in'}</button>
          <button type="button" aria-label="Simulate sound output" title={agentState === 'answering' ? 'Agent speaks: simulate one spoken accent' : 'Sound out is available only while Answering'} aria-pressed={soundMode === 'output'} disabled={unavailable || agentState !== 'answering'} onClick={() => triggerSound('output')}><AudioLines size={12} aria-hidden="true" />{soundMode === 'output' ? 'Speaking…' : 'Sound out'}</button>
        </fieldset>
      </div>
      <div className="light-drift-controls">
        <fieldset className="light-drift-states" aria-label="Agent state demo">
          {lightAgentStates.map(state => (
            <button key={state.id} type="button" aria-pressed={agentState === state.id} onClick={() => selectState(state.id)}>{state.label}</button>
          ))}
        </fieldset>
        <div className="light-drift-sliders">
          {controls.map(control => (
            <label key={control.key} htmlFor={`${id}-${control.key}`}>
              <span>{control.label}<output htmlFor={`${id}-${control.key}`}>{control.value}</output></span>
              <input id={`${id}-${control.key}`} type="range" min={control.min} max={control.max} step={control.step} value={settings[control.key]} aria-valuetext={control.value} onChange={event => change(control.key, Number(event.target.value))} />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LightDrift({ replayKey }: { replayKey: number }) {
  return <LightDriftStudy key={replayKey} />;
}
