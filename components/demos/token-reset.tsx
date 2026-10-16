'use client';

import {
  ArrowUp,
  ChevronDown,
  ChevronRight,
  CornerDownLeft,
  Fuel,
  Mic,
  Plus,
  RotateCcw,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import './token-reset.css';

const RADIUS = 19;
const PLAYBACK_DURATION = 14.5;
const GRAVITY = 685;
const CONTACT_GRAVITY = 2100;
const BEATS = {
  launch: 0.22,
  land: 0.6,
  rebound: 0.655,
  settle: 0.815,
  roll: 0.85,
  ultra: 2.95,
  drain: 4.05,
  escape: 8.55,
};
const LETTERS = ['r', 'e', 's', 'e', 't'];
const CODE_SPARKS = ['{}', '</>', ';', '=>', '()', '[]'];
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const smooth = (p: number) => p * p * (3 - 2 * p);
type Point = { x: number; y: number };
type Pose = Point & {
  sx: number;
  sy: number;
  white: number;
  turn: number;
};
type TubeSample = Point & { distance: number; time: number };

function geometry(compact: boolean) {
  const composer = compact
    ? { x: 30, y: 48, width: 460, height: 140 }
    : { x: 60, y: 104, width: 520, height: 160 };
  const model = compact
    ? { x: 30, y: 229, width: 330, height: 140 }
    : { x: 600, y: 104, width: 340, height: 160 };
  const keyboard = {
    x: composer.x,
    y: compact ? 479 : 314,
    width: composer.width,
    height: 170,
  };
  const gauge = compact
    ? { x: 378, y: 267, size: 86 }
    : { x: 956, y: 154, size: 110 };
  const warning = compact
    ? { x: 465, y: 324, size: 42 }
    : { x: 1086, y: 204, size: 60 };
  const send = {
    x: composer.x + composer.width - 35,
    y: composer.y + composer.height - 34,
  };
  const track = {
    x: model.x + 20,
    y: model.y + model.height - 39,
    width: model.width - 40,
  };
  const left = { x: track.x + RADIUS - 1, y: track.y };
  const right = { x: track.x + track.width - RADIUS + 1, y: track.y };
  const hit = {
    x: warning.x + warning.size / 2 - 15,
    y: warning.y + warning.size / 2,
  };
  const keyScale = keyboard.width / 520;
  const keys = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].flatMap((row, r) =>
    row.split('').map((letter, i) => ({
      letter,
      x: (15 + r * 15 + i * 43) * keyScale,
      y: 18 + r * 39,
    })),
  );
  const key = (letter: string) => {
    const k = keys.find((item) => item.letter === letter)!;
    return {
      x: keyboard.x + k.x + 18 * keyScale,
      y: keyboard.y + k.y - RADIUS,
    };
  };
  const enter = {
    x: keyboard.x + keyboard.width - 39 * keyScale,
    y: keyboard.y + 49 - RADIUS,
  };
  const mouth = {
    x: warning.x + warning.size / 2,
    y: warning.y + warning.size + 19,
  };
  const elbow = { x: mouth.x, y: compact ? 431 : 338 };
  const bend = { x: elbow.x - 20, y: elbow.y + 20 };
  const outlet = {
    x: keyboard.x + keyboard.width + (compact ? 18 : 30),
    y: keyboard.y + 89,
  };
  const pipePath = `M ${mouth.x} ${mouth.y} L ${elbow.x} ${elbow.y} Q ${elbow.x} ${bend.y} ${bend.x} ${bend.y} L ${outlet.x} ${outlet.y}`;

  // Rolling energy, including the sphere's rotational inertia: v² = v₀² +
  // 2(5/7)gΔh. Arc-length samples preserve acceleration through the elbow.
  const points: Point[] = [];
  for (let i = 0; i <= 24; i++)
    points.push({ x: mouth.x, y: mix(mouth.y, elbow.y, i / 24) });
  for (let i = 1; i <= 24; i++) {
    const p = i / 24;
    points.push({ x: elbow.x - 20 * p * p, y: elbow.y + 20 * (2 * p - p * p) });
  }
  for (let i = 1; i <= 180; i++)
    points.push({
      x: mix(bend.x, outlet.x, i / 180),
      y: mix(bend.y, outlet.y, i / 180),
    });
  const tube: TubeSample[] = [{ ...points[0], distance: 0, time: 0 }];
  for (let i = 1; i < points.length; i++) {
    const previous = tube[i - 1];
    const point = points[i];
    const ds = Math.hypot(point.x - previous.x, point.y - previous.y);
    const speed = (y: number) =>
      Math.sqrt(150 ** 2 + 2 * (5 / 7) * GRAVITY * Math.max(0, y - mouth.y));
    tube.push({
      ...point,
      distance: previous.distance + ds,
      time: previous.time + ds / ((speed(previous.y) + speed(point.y)) / 2),
    });
  }
  const tubeStart = 10.05;
  const tubeEnd = tubeStart + tube[tube.length - 1].time;
  const touches = [0.56, 1.02, 1.5, 1.94, 2.44, 3.07].map(
    (offset) => tubeEnd + offset,
  );
  const returnStart = touches[5] + 0.22;
  const home = returnStart + 1.2;
  return {
    compact,
    width: compact ? 520 : 1200,
    height: compact ? 700 : 530,
    composer,
    model,
    keyboard,
    gauge,
    warning,
    send,
    track,
    left,
    right,
    hit,
    keys,
    key,
    keyScale,
    enter,
    mouth,
    elbow,
    bend,
    outlet,
    pipePath,
    tube,
    tubeStart,
    tubeEnd,
    touches,
    returnStart,
    home,
    end: home + 0.55,
  };
}
type Geometry = ReturnType<typeof geometry>;
function leap(
  from: Point,
  to: Point,
  p: number,
  duration: number,
  white = 1,
  turn = 0,
  gravity = GRAVITY,
): Pose {
  const elapsed = p * duration;
  const vy = (to.y - from.y) / duration - 0.5 * gravity * duration;
  return {
    x: mix(from.x, to.x, p),
    y: from.y + vy * elapsed + 0.5 * gravity * elapsed ** 2,
    sx: 1,
    sy: 1,
    white,
    turn,
  };
}
function sampleTube(g: Geometry, elapsed: number) {
  let index = g.tube.findIndex((sample) => sample.time >= elapsed);
  if (index < 1) index = elapsed <= 0 ? 1 : g.tube.length - 1;
  const a = g.tube[index - 1];
  const b = g.tube[index];
  const p = clamp((elapsed - a.time) / (b.time - a.time));
  return {
    x: mix(a.x, b.x, p),
    y: mix(a.y, b.y, p),
    distance: mix(a.distance, b.distance, p),
  };
}
// Integrating an increasing angular velocity avoids a sudden speed jump.
function spinAt(elapsed: number) {
  const duration = BEATS.escape - BEATS.ultra;
  return 320 * elapsed + ((5600 * duration) / 4) * (elapsed / duration) ** 4;
}
function shakeAt(t: number) {
  const intensity =
    t >= BEATS.ultra && t < BEATS.escape
      ? clamp((t - 6.0) / (BEATS.escape - 6.0)) ** 2
      : 0;
  return {
    x: Math.sin(t * 137) * intensity * 2.2,
    y: Math.sin(t * 113) * intensity * 1.5,
    angle: Math.sin(t * 97) * intensity * 2,
  };
}
const SPARK_GRAVITY = 1100;
function frictionPowerAt(elapsed: number) {
  const u = clamp(elapsed / (BEATS.escape - BEATS.ultra));
  // spinAt's angular velocity is 320 + 5600u³. The same slip speed drives
  // ejection energy, emission density and contact incandescence.
  return Math.sqrt(u ** 3);
}
function sparkEmissionAt(elapsed: number) {
  const duration = BEATS.escape - BEATS.ultra;
  return 40 * elapsed + (50 * elapsed ** 4) / duration ** 3;
}
function sparkBirthAt(serial: number) {
  const duration = BEATS.escape - BEATS.ultra;
  let birth = (duration * serial) / sparkEmissionAt(duration);
  for (let i = 0; i < 6; i++) {
    const rate = 40 + 200 * (birth / duration) ** 3;
    birth = Math.max(
      0,
      Math.min(duration, birth - (sparkEmissionAt(birth) - serial) / rate),
    );
  }
  return birth;
}
function sparkRandom(serial: number, salt: number) {
  // Independent hashes prevent size, direction and lifetime forming visible lanes.
  let n = Math.imul(serial + salt * 1013, 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function FrictionSparks({ time, g }: { time: number; g: Geometry }) {
  const id = useId().replace(/:/g, '');
  if (time < BEATS.ultra || time >= BEATS.escape) return null;
  const elapsed = time - BEATS.ultra;
  const energy = frictionPowerAt(elapsed);
  const shake = shakeAt(time);
  const contact = {
    x: g.right.x + shake.x - 2,
    y: g.right.y + RADIUS + shake.y,
  };
  const flicker =
    0.84 + Math.sin(time * 83) * 0.1 + Math.sin(time * 139) * 0.06;
  const newest = Math.floor(sparkEmissionAt(elapsed));
  const particles = Array.from({ length: 160 }, (_, i) => {
    const serial = newest - i;
    if (serial < 0) return null;
    const birth = sparkBirthAt(serial);
    const seed = sparkRandom(serial, 1);
    const spread = sparkRandom(serial, 2);
    const size = sparkRandom(serial, 3);
    const duration = sparkRandom(serial, 4);
    const age = elapsed - birth;
    const power = frictionPowerAt(birth);
    const lifetime = 0.23 + power * 0.2 + duration * 0.24;
    if (age < 0.003 || age >= lifetime || (birth * 7) % 1 > 0.92) return null;
    const arc = sparkRandom(serial, 5) > 0.9;
    // Clockwise slip at the bottom ejects debris backward along the track.
    // Keep a shallow spread around that tangent; speed, not launch angle,
    // increases with friction. The slight upward kick is an art direction
    // choice to make the gravity-driven arc readable at this UI scale.
    const angle = ((arc ? 16 + spread * 8 : 4 + spread * 18) * Math.PI) / 180;
    const vx = -(220 + power * 420) * (0.8 + seed * 0.4);
    const vy = -Math.abs(vx) * Math.tan(angle);
    const speed = Math.hypot(vx, vy);
    const birthShake = shakeAt(BEATS.ultra + birth);
    const origin = {
      x: g.right.x + birthShake.x - 2,
      y: g.right.y + RADIUS + birthShake.y,
    };
    const point = (t: number) => ({
      x: origin.x + vx * t,
      y: origin.y + vy * t + 0.5 * SPARK_GRAVITY * t ** 2,
    });
    // Most fragments stay short. A few retain enough of their flight history
    // to show the ascent, apex and fall without merging into continuous jets.
    const history = arc
      ? (0.18 + power * 0.2) * (0.85 + size * 0.35)
      : (0.008 + power * 0.014) * (0.65 + size * 0.75);
    const trailAge = Math.max(0, age - history);
    const dt = age - trailAge;
    const head = point(age);
    const tail = point(trailAge);
    const control = {
      x: tail.x + (vx * dt) / 2,
      y: tail.y + ((vy + SPARK_GRAVITY * trailAge) * dt) / 2,
    };
    const trail = `M ${tail.x} ${tail.y} Q ${control.x} ${control.y} ${head.x} ${head.y}`;
    const cooling = age / lifetime;
    const opacity = (1 - cooling) ** 0.38;
    const glint = serial % 11 === 0 && age < 0.11;
    const code =
      serial % 19 === 7
        ? CODE_SPARKS[Math.floor(serial / 19) % CODE_SPARKS.length]
        : null;
    return (
      <g
        key={serial}
        className="tr-spark-fragment"
        data-rise={(vy * vy) / (2 * SPARK_GRAVITY)}
        data-speed={speed}
        data-angle={(angle * 180) / Math.PI}
        opacity={opacity}
      >
        <path
          className={`tr-spark-trail${arc ? ' tr-spark-arc' : ''}`}
          d={trail}
          fill="none"
          stroke={`url(#${id}-${arc ? 'spark-arc' : 'spark-trail'})`}
          strokeWidth={arc ? 0.65 + size * 0.25 : 0.8 + size * 0.35}
          strokeLinecap="round"
        />
        {code ? (
          <text
            className="tr-spark-code"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={12 + size * 2}
            fill={cooling < 0.55 ? '#efa83e' : '#df8c32'}
            opacity={clamp(age / 0.055)}
            transform={`translate(${head.x} ${head.y}) rotate(${(spread - 0.5) * 18 + (seed > 0.5 ? 1 : -1) * (18 + duration * 30) * age})`}
          >
            {code}
          </text>
        ) : (
          <circle
            cx={head.x}
            cy={head.y}
            r={0.35 + size * 0.4}
            fill={cooling < 0.5 ? '#fff4c6' : '#ffc66e'}
          />
        )}
        {glint && !code && (
          <path
            className="tr-spark-star"
            d="M 0 -1 L .19 -.19 L 1 0 L .19 .19 L 0 1 L -.19 .19 L -1 0 L -.19 -.19 Z"
            transform={`translate(${head.x} ${head.y}) rotate(${seed * 180 + age * 120}) scale(${(2.2 + power * 1.4) * Math.sin((age / 0.11) * Math.PI)})`}
            fill="#fff0ad"
            opacity={1 - age / 0.11}
          />
        )}
      </g>
    );
  });
  return (
    <svg
      className="tr-sparks"
      viewBox={`0 0 ${g.width} ${g.height}`}
      aria-hidden="true"
      data-energy={energy}
    >
      <defs>
        <linearGradient
          id={`${id}-spark-trail`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0" stopColor="#ffd477" />
          <stop offset=".18" stopColor="#ffc85e" />
          <stop offset=".65" stopColor="#ff9b26" />
          <stop offset="1" stopColor="#ef790f" stopOpacity=".5" />
        </linearGradient>
        <linearGradient
          id={`${id}-spark-arc`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0" stopColor="#ffd477" />
          <stop offset=".3" stopColor="#ffba46" stopOpacity=".8" />
          <stop offset=".7" stopColor="#ff9b26" stopOpacity=".4" />
          <stop offset="1" stopColor="#ef790f" stopOpacity="0" />
        </linearGradient>
      </defs>
      {particles}
      <g className="tr-friction-contact" opacity={flicker}>
        <path
          d={`M ${contact.x - 2.5 - energy} ${contact.y} L ${contact.x + 1} ${contact.y}`}
          stroke="#ffbd47"
          strokeWidth={1.5 + energy * 0.3}
          strokeLinecap="round"
        />
        <circle
          className="tr-friction-core"
          cx={contact.x - 0.5}
          cy={contact.y}
          r={0.6 + energy * 0.25}
          fill="#fffce8"
        />
      </g>
    </svg>
  );
}
function poseAt(t: number, g: Geometry): Pose {
  const base: Pose = {
    ...g.send,
    sx: 1,
    sy: 1,
    white: 0,
    turn: 0,
  };
  if (t < BEATS.launch) {
    const pressure =
      t < 0.16 ? smooth(t / 0.16) : 1 - smooth((t - 0.16) / 0.06);
    return {
      ...base,
      y: base.y + pressure * 5,
      sx: 1 + pressure * 0.24,
      sy: 1 - pressure * 0.25,
    };
  }
  if (t < BEATS.land)
    return leap(
      g.send,
      g.left,
      (t - BEATS.launch) / (BEATS.land - BEATS.launch),
      BEATS.land - BEATS.launch,
      0,
      0,
      CONTACT_GRAVITY,
    );
  if (t < BEATS.rebound) {
    const pressure = Math.sin(
      ((t - BEATS.land) / (BEATS.rebound - BEATS.land)) * Math.PI,
    );
    return {
      ...base,
      ...g.left,
      y: g.left.y + pressure * 5,
      sx: 1 + pressure * 0.23,
      sy: 1 - pressure * 0.25,
    };
  }
  if (t < BEATS.settle)
    return leap(
      g.left,
      g.left,
      (t - BEATS.rebound) / (BEATS.settle - BEATS.rebound),
      BEATS.settle - BEATS.rebound,
      smooth(clamp((t - BEATS.rebound - 0.035) / 0.055)),
      0,
      3200,
    );
  if (t < BEATS.roll) {
    const pressure = Math.sin(
      ((t - BEATS.settle) / (BEATS.roll - BEATS.settle)) * Math.PI,
    );
    return {
      ...base,
      ...g.left,
      y: g.left.y + pressure * 2,
      sx: 1 + pressure * 0.08,
      sy: 1 - pressure * 0.09,
      white: 1,
    };
  }
  if (t < BEATS.ultra) {
    const p = smooth(clamp((t - BEATS.roll) / (BEATS.ultra - BEATS.roll)));
    const distance = (g.right.x - g.left.x) * p;
    return {
      ...base,
      x: g.left.x + distance,
      y: g.left.y,
      white: 1,
      turn: ((distance / RADIUS) * 180) / Math.PI,
    };
  }
  if (t < 8.55) {
    const strain = t - BEATS.ultra;
    const shake = shakeAt(t);
    return {
      ...base,
      x: g.right.x + shake.x,
      y: g.right.y + shake.y,
      white: 1,
      turn:
        (((g.right.x - g.left.x) / RADIUS) * 180) / Math.PI + spinAt(strain),
    };
  }
  if (t < 9.67)
    return leap(g.right, g.hit, (t - 8.55) / 1.12, 1.12, 1, (t - 8.55) * 900);
  if (t < 9.78) {
    const p = (t - 9.67) / 0.11;
    return {
      ...base,
      ...g.hit,
      x: g.hit.x + Math.sin(p * Math.PI) * 3,
      sx: 1 - Math.sin(p * Math.PI) * 0.09,
      sy: 1 + Math.sin(p * Math.PI) * 0.08,
      white: 1,
    };
  }
  if (t < g.tubeStart)
    return leap(
      g.hit,
      g.mouth,
      (t - 9.78) / (g.tubeStart - 9.78),
      g.tubeStart - 9.78,
    );
  if (t < g.tubeEnd) {
    const point = sampleTube(g, t - g.tubeStart);
    return {
      ...base,
      x: point.x,
      y: point.y,
      white: 1,
      turn: ((point.distance / RADIUS) * 180) / Math.PI,
    };
  }
  if (t < g.touches[0])
    return leap(
      g.outlet,
      g.key('r'),
      (t - g.tubeEnd) / 0.56,
      0.56,
      1,
      0,
      CONTACT_GRAVITY,
    );
  for (let i = 0; i < g.touches.length - 1; i++) {
    if (t < g.touches[i + 1]) {
      const from = g.key(LETTERS[i]);
      const to = i === 4 ? g.enter : g.key(LETTERS[i + 1]);
      const elapsed = t - g.touches[i];
      if (elapsed < 0.12) {
        const p = Math.sin((elapsed / 0.12) * Math.PI);
        return {
          ...base,
          ...from,
          y: from.y + p * (6 + RADIUS * 0.18),
          sx: 1 + p * 0.16,
          sy: 1 - p * 0.18,
          white: 1,
        };
      }
      const duration = g.touches[i + 1] - g.touches[i] - 0.12;
      return leap(
        from,
        to,
        (elapsed - 0.12) / duration,
        duration,
        1,
        0,
        CONTACT_GRAVITY,
      );
    }
  }
  if (t < g.returnStart) {
    const p = Math.sin(((t - g.touches[5]) / 0.22) * Math.PI);
    return {
      ...base,
      ...g.enter,
      y: g.enter.y + p * (6 + RADIUS * 0.2),
      sx: 1 + p * 0.18,
      sy: 1 - p * 0.2,
      white: 1,
    };
  }
  if (t < g.home)
    return leap(
      g.enter,
      g.send,
      (t - g.returnStart) / 1.2,
      1.2,
      1 - smooth(clamp((t - g.returnStart) / 0.08)),
    );
  if (t < g.home + 0.36)
    return leap(g.send, g.send, (t - g.home) / 0.36, 0.36, 0);
  return base;
}
function stateAt(t: number, g: Geometry) {
  const fuel =
    t < 4.05
      ? 100
      : t < 8.55
        ? 100 *
          (1 - clamp((t - BEATS.drain) / (BEATS.escape - BEATS.drain)) ** 2.6)
        : t < g.returnStart
          ? 0
          : 100 * smooth(clamp((t - g.returnStart) / 0.85));
  const progress =
    t < BEATS.roll
      ? 0
      : t < 2.95
        ? smooth(clamp((t - BEATS.roll) / (BEATS.ultra - BEATS.roll)))
        : t < g.returnStart
          ? 1
          : 1 - smooth(clamp((t - g.returnStart) / 0.85));
  const activeIndex = g.touches.findIndex(
    (time) => t >= time && t < time + (time === g.touches[5] ? 0.22 : 0.12),
  );
  const warningOn = progress >= 0.94 && t < 9.67;
  const warningTone = !warningOn
    ? 'off'
    : fuel < 20
      ? 'red'
      : fuel < 60
        ? 'amber'
        : 'green';
  // Integrate the increasing blink rate so its phase remains continuous.
  const warningStart =
    BEATS.drain + (BEATS.escape - BEATS.drain) * 0.4 ** (1 / 2.6);
  const warningElapsed = Math.max(0, t - warningStart);
  const warningDuration = BEATS.escape - warningStart;
  const warningProgress = clamp(warningElapsed / warningDuration);
  const warningFrequency = 0.8 + 2.6 * warningProgress ** 2;
  const warningCycles =
    0.8 * Math.min(warningElapsed, warningDuration) +
    ((2.6 * warningDuration) / 3) * warningProgress ** 3 +
    3.4 * Math.max(0, t - BEATS.escape);
  const warningOpacity =
    warningTone === 'amber' || warningTone === 'red'
      ? 0.14 + 0.86 * smooth((1 + Math.cos(warningCycles * Math.PI * 2)) / 2)
      : 1;
  const typed = 'RESET'.slice(
    0,
    g.touches.slice(0, 5).filter((touch) => t >= touch).length,
  );
  const phase =
    t < BEATS.launch
      ? 'idle'
      : t < BEATS.roll
        ? 'launch'
        : t < 2.95
          ? 'climb'
          : t < 4.05
            ? 'strain'
            : t < 8.55
              ? 'drain'
              : t < 9.67
                ? 'breakout'
                : t < g.tubeStart
                  ? 'impact'
                  : t < g.tubeEnd
                    ? 'pipe'
                    : t < g.returnStart
                      ? 'typing'
                      : t < g.home
                        ? 'return'
                        : 'home';
  return {
    fuel,
    progress,
    typed,
    active:
      activeIndex < 0 ? '' : activeIndex === 5 ? 'enter' : LETTERS[activeIndex],
    keyPressure:
      activeIndex < 0
        ? 0
        : Math.sin(
            ((t - g.touches[activeIndex]) / (activeIndex === 5 ? 0.22 : 0.12)) *
              Math.PI,
          ),
    phase,
    straining: t >= 2.95 && t < 8.55,
    ultra: progress > 0.93,
    broken: t >= 8.55 && t < g.returnStart,
    warningTone,
    warningOpacity,
    warningFrequency,
    warningImpact: t >= 9.67 && t < 10.12,
    sent: t >= g.returnStart,
    shake: shakeAt(t),
  };
}
function strengthLabel(value: number) {
  return value < 15
    ? 'Light'
    : value < 34
      ? 'Medium'
      : value < 53
        ? 'High'
        : value < 72
          ? 'Extra High'
          : value < 94
            ? 'Max'
            : 'Ultra';
}

function FuelGauge({
  level,
  shake,
}: {
  level: number;
  shake: ReturnType<typeof shakeAt>;
}) {
  return (
    <div
      className="tr-fuel-gauge"
      style={{
        transform: `translate(${shake.x}px, ${shake.y}px) rotate(${shake.angle}deg)`,
      }}
      aria-label={`${Math.round(level)} percent tokens remaining`}
    >
      <svg viewBox="0 0 110 110" aria-hidden="true">
        <circle
          cx="55"
          cy="55"
          r="53"
          fill="#171a20"
          stroke="#444a54"
          strokeWidth="1"
        />
        <circle cx="55" cy="55" r="49" fill="none" stroke="#ffffff0d" />
        {Array.from({ length: 25 }, (_, i) => {
          const angle = ((-210 + i * 10) * Math.PI) / 180;
          const outer = i % 4 === 0 ? 42 : 40;
          const inner = i % 4 === 0 ? 34 : 37;
          return (
            <line
              key={i}
              x1={55 + Math.cos(angle) * inner}
              y1={54 + Math.sin(angle) * inner}
              x2={55 + Math.cos(angle) * outer}
              y2={54 + Math.sin(angle) * outer}
              stroke={i < 5 ? '#f4a05b' : '#aeb5c0'}
              strokeWidth={i % 4 === 0 ? 1.4 : 0.7}
            />
          );
        })}
        <text x="19" y="81">
          E
        </text>
        <text x="88" y="81">
          F
        </text>
        <g transform={`rotate(${-210 + level * 2.4} 55 54)`}>
          <path
            d="M 49 51 L 88 54 L 49 57 Z"
            fill={level < 12 ? '#ffb566' : '#f2f3f6'}
          />
          <circle cx="55" cy="54" r="4" fill="#777f8d" />
        </g>
        <text className="tr-gauge-number" x="55" y="93" textAnchor="middle">
          {Math.round(level)}%
        </text>
      </svg>
      <Fuel className="tr-fuel-icon" size={11} aria-hidden="true" />
      <span className="tr-fuel-label">TOKENS</span>
    </div>
  );
}
function TokenResetStudy({ replayKey }: { replayKey: number }) {
  const reduced = !!useReducedMotion();
  const id = useId().replace(/:/g, '');
  const viewport = useRef<HTMLDivElement>(null);
  const actor = useRef<HTMLDivElement>(null);
  const clock = useRef({ time: 0, previous: 0, raf: 0 });
  const [{ scale, compact }, setSize] = useState({
    scale: 0.75,
    compact: false,
  });
  const g = useMemo(() => geometry(compact), [compact]);
  const playbackRate = g.end / PLAYBACK_DURATION;
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(replayKey > 0);
  const [finished, setFinished] = useState(false);
  const [strength, setStrength] = useState(0);
  const busy = running;
  const frame = stateAt(time, g);
  const effort = busy || finished ? frame.progress * 100 : strength;
  const label = strengthLabel(effort);
  const ballOnTrack = busy && time >= BEATS.roll && time < BEATS.escape;
  const fillWidth =
    effort <= 0
      ? 0
      : ballOnTrack
        ? RADIUS - 1 + ((g.track.width - 2 * (RADIUS - 1)) * effort) / 100
        : RADIUS + ((g.track.width - RADIUS) * effort) / 100;
  const paint = useCallback(
    (t: number) => {
      const p = poseAt(t, g);
      if (actor.current) {
        actor.current.style.transform = `translate(${p.x - RADIUS}px, ${p.y - RADIUS}px) scale(${p.sx}, ${p.sy})`;
        actor.current.style.setProperty('--tr-white', `${p.white * 100}%`);
        actor.current.style.setProperty('--tr-turn', `${p.turn}deg`);
      }
    },
    [g],
  );
  const start = useCallback(() => {
    clock.current.time = 0;
    paint(0);
    setTime(0);
    setFinished(false);
    setRunning(true);
  }, [paint]);
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = geometry(entry.contentRect.width < 600);
      setSize({
        compact: next.compact,
        scale: Math.min(
          entry.contentRect.width / next.width,
          entry.contentRect.height / next.height,
        ),
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    paint(clock.current.time);
  }, [paint]);
  useEffect(() => {
    if (!running) return;
    const timeline = clock.current;
    timeline.previous = 0;
    const tick = (now: number) => {
      if (reduced) {
        timeline.time = g.end;
        paint(g.end);
        setTime(g.end);
        setRunning(false);
        setFinished(true);
        return;
      }
      if (document.hidden) {
        timeline.previous = 0;
        timeline.raf = requestAnimationFrame(tick);
        return;
      }
      if (timeline.previous)
        timeline.time +=
          Math.min((now - timeline.previous) / 1000, 0.05) * playbackRate;
      timeline.previous = now;
      const t = Math.min(timeline.time, g.end);
      paint(t);
      setTime(t);
      if (t >= g.end) {
        setRunning(false);
        setFinished(true);
      } else timeline.raf = requestAnimationFrame(tick);
    };
    timeline.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(timeline.raf);
  }, [running, reduced, paint, g, playbackRate]);

  const variables = {
    '--tr-playback-rate': playbackRate,
    '--tr-composer-x': `${g.composer.x}px`,
    '--tr-composer-y': `${g.composer.y}px`,
    '--tr-composer-width': `${g.composer.width}px`,
    '--tr-panel-height': `${g.composer.height}px`,
    '--tr-model-x': `${g.model.x}px`,
    '--tr-model-y': `${g.model.y}px`,
    '--tr-model-width': `${g.model.width}px`,
    '--tr-track-width': `${g.track.width}px`,
    '--tr-keyboard-y': `${g.keyboard.y}px`,
    '--tr-key-scale': g.keyScale,
    '--tr-key-press': frame.keyPressure,
    '--tr-gauge-x': `${g.gauge.x}px`,
    '--tr-gauge-y': `${g.gauge.y}px`,
    '--tr-gauge-size': `${g.gauge.size}px`,
    '--tr-warning-x': `${g.warning.x}px`,
    '--tr-warning-y': `${g.warning.y}px`,
    '--tr-warning-size': `${g.warning.size}px`,
  } as CSSProperties;
  return (
    <div
      className="token-reset-demo"
      data-time={time.toFixed(3)}
      data-phase={frame.phase}
      data-state={busy ? 'running' : finished ? 'complete' : 'idle'}
    >
      <div className="tr-topline">
        <span>A LITTLE THOUGHT / A BIG ESCAPE</span>
        <span>035 / TOKEN RESET</span>
      </div>
      <div ref={viewport} className="tr-viewport">
        <div
          className="tr-board"
          data-compact={compact}
          style={{
            ...variables,
            width: g.width,
            height: g.height,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          <svg
            className="tr-glass-tube"
            viewBox={`0 0 ${g.width} ${g.height}`}
            aria-hidden="true"
          >
            <defs>
              <mask id={`${id}-glass`}>
                <path
                  d={g.pipePath}
                  fill="none"
                  stroke="white"
                  strokeWidth="47"
                  strokeLinecap="round"
                />
                <path
                  d={g.pipePath}
                  fill="none"
                  stroke="black"
                  strokeWidth="43"
                  strokeLinecap="round"
                />
              </mask>
            </defs>
            <path
              d={g.pipePath}
              fill="none"
              stroke="#cce7fa"
              strokeOpacity=".24"
              strokeWidth="47"
              mask={`url(#${id}-glass)`}
            />
            <path
              d={g.pipePath}
              fill="none"
              stroke="#a6c9e6"
              strokeOpacity=".035"
              strokeWidth="43"
            />
            <path
              d={g.pipePath}
              fill="none"
              stroke="#ffffff"
              strokeOpacity=".17"
              strokeWidth="1.3"
              transform="translate(-10 -12)"
            />
            <ellipse
              cx={g.mouth.x}
              cy={g.mouth.y}
              rx="23"
              ry="5"
              fill="#d8efff0c"
              stroke="#d8efff66"
              strokeWidth="1"
            />
            <ellipse
              cx={g.outlet.x}
              cy={g.outlet.y}
              rx="5"
              ry="23"
              fill="#d8efff05"
              stroke="#d8efff66"
              strokeWidth="1"
              transform={`rotate(8 ${g.outlet.x} ${g.outlet.y})`}
            />
          </svg>
          <div
            className={`tr-composer${frame.sent ? ' tr-composer-sent' : ''}`}
          >
            <span className="tr-prompt">
              {time >= g.tubeEnd && !frame.sent ? (
                <>
                  {frame.typed}
                  <span className="tr-caret" />
                </>
              ) : frame.sent ? (
                'RESET'
              ) : (
                'Let’s try something…'
              )}
            </span>
            <div className="tr-composer-toolbar">
              <Plus size={22} aria-hidden="true" />
              <button
                type="button"
                className="tr-model-selector"
                disabled={busy}
                onClick={() =>
                  document.getElementById(`${id}-strength`)?.focus()
                }
              >
                <span>GPT-6 Astra</span>
                <span>{label}</span>
                <ChevronDown size={13} />
              </button>
              <Mic size={22} aria-hidden="true" />
            </div>
            <button
              type="button"
              className="tr-send"
              aria-label="Send a thought and start the token reset animation"
              disabled={busy}
              onClick={start}
            />
          </div>
          <div
            className="tr-model-panel"
            data-ultra={label === 'Ultra'}
            data-straining={frame.straining}
            data-broken={frame.broken}
            style={{
              transform: `translate(${frame.shake.x}px, ${frame.shake.y}px)`,
            }}
          >
            <div className="tr-model-header">
              <Zap size={21} aria-hidden="true" />
              <span>{label}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => setStrength(0)}
                aria-label="Reset model strength to light"
              >
                <RotateCcw size={21} />
              </button>
            </div>
            <div className="tr-model-name">
              GPT-6 Astra <ChevronRight size={14} aria-hidden="true" />
            </div>
            <div className="tr-track">
              <span
                className="tr-track-fill"
                style={{
                  width: `${fillWidth}px`,
                }}
              />
              <span className="tr-track-stops" aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => (
                  <i
                    key={i}
                    data-filled={effort > 0 && effort >= i * 25}
                    style={{
                      left:
                        RADIUS -
                        1 +
                        ((g.track.width - 2 * (RADIUS - 1)) * i) / 4,
                    }}
                  />
                ))}
              </span>
              {label === 'Ultra' && (
                <span className="tr-track-particles" aria-hidden="true">
                  {Array.from({ length: 28 }, (_, i) => (
                    <i
                      key={i}
                      style={{
                        left: `${5 + ((i * 37) % 90)}%`,
                        top: `${16 + ((i * 29) % 65)}%`,
                        animationDelay: `${-i * 0.17}s`,
                        width: i % 3 ? 2 : 3,
                        height: i % 3 ? 2 : 3,
                      }}
                    />
                  ))}
                </span>
              )}
            </div>
            <input
              type="range"
              id={`${id}-strength`}
              className="tr-strength"
              aria-label="Model strength"
              aria-valuetext={label}
              min={0}
              max={100}
              value={Math.round(effort)}
              disabled={busy}
              onChange={(event) => {
                setStrength(Number(event.target.value));
                setFinished(false);
              }}
            />
            <span className="tr-limit" aria-hidden="true" />
            <span className="tr-limit-fragments" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
          <FrictionSparks time={time} g={g} />
          <FuelGauge level={frame.fuel} shake={frame.shake} />
          <div
            className={`tr-warning${frame.warningImpact ? ' is-impact' : ''}`}
            data-light={frame.warningTone}
            data-blink-hz={
              frame.warningTone === 'amber' || frame.warningTone === 'red'
                ? frame.warningFrequency
                : 0
            }
            style={{ opacity: frame.warningOpacity }}
            aria-hidden="true"
          >
            <TriangleAlert size={g.warning.size - 8} strokeWidth={1.5} />
          </div>
          <div
            className={`tr-keyboard${time >= g.tubeEnd ? ' is-awake' : ''}`}
            aria-hidden="true"
          >
            {g.keys.map((key) => (
              <div
                key={key.letter}
                className={`tr-key${frame.active === key.letter ? ' is-pressed' : ''}`}
                style={{ left: key.x, top: key.y }}
              >
                {key.letter.toUpperCase()}
              </div>
            ))}
            <div
              className={`tr-key tr-enter${frame.active === 'enter' ? ' is-pressed' : ''}`}
            >
              <CornerDownLeft size={23} />
              <span>enter</span>
            </div>
            <div className="tr-space-key" />
          </div>
          <div ref={actor} className="tr-ball" aria-hidden="true" />
          <span
            className="tr-send-icon"
            style={{ left: g.send.x - RADIUS, top: g.send.y - RADIUS }}
            aria-hidden="true"
          >
            <ArrowUp size={25} strokeWidth={2.1} />
          </span>
          <svg
            className="tr-glass-front"
            viewBox={`0 0 ${g.width} ${g.height}`}
            aria-hidden="true"
          >
            <path
              d={g.pipePath}
              fill="none"
              stroke="#e6f5ff"
              strokeOpacity=".11"
              strokeWidth="2"
              transform="translate(9 13)"
            />
          </svg>
        </div>
      </div>
      <output className="tr-sr" aria-live="polite">
        {finished
          ? 'Reset sent. Tokens restored to 100 percent.'
          : busy
            ? 'Token reset animation in progress.'
            : '100 percent tokens remaining. Activate Send to begin.'}
      </output>
    </div>
  );
}
export function TokenReset({ replayKey }: { replayKey: number }) {
  return <TokenResetStudy key={replayKey} replayKey={replayKey} />;
}
