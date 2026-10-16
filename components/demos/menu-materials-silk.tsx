'use client';

import { useEffect, useRef, useState } from 'react';
import type * as Three from 'three';
import { menuVibes } from './menu-material-shared';

type SilkControls = {
  setOpen: (value: boolean) => void;
  setSelection: (value: number) => void;
  dispose: () => void;
};
const WIDTH = 248;
const HEIGHT = 180;

// A hanging sheet driven by gravity and a unilateral tensile spring. Once its
// length is taken up, the load catches and excites a damped traveling bend.
// This is an art-directed membrane, not a full self-colliding cloth solver.
async function makeSilk(
  canvas: HTMLCanvasElement,
  open: boolean,
  selected: number,
  reduced: boolean,
): Promise<SilkControls> {
  const T = await import('three');
  const renderer = new T.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(284, 224, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-142, 142, 108, -116, 0.1, 1500);
  camera.position.set(0, -90, 600);
  camera.lookAt(0, -90, 0);
  scene.add(new T.HemisphereLight(0xffffff, 0x969696, 2.05));
  const key = new T.DirectionalLight(0xffffff, 2.5);
  key.position.set(-190, 150, 250);
  scene.add(key);
  const rim = new T.DirectionalLight(0xffffff, 0.85);
  rim.position.set(220, -100, 120);
  scene.add(rim);
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = WIDTH * 3;
  textureCanvas.height = HEIGHT * 3;
  const context = textureCanvas.getContext('2d')!;
  const texture = new T.CanvasTexture(textureCanvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const font = getComputedStyle(document.body).fontFamily;
  function paint(selection: number) {
    context.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
    context.save();
    context.scale(3, 3);
    context.beginPath();
    context.roundRect(0, 0, WIDTH, HEIGHT, 9);
    context.clip();
    context.fillStyle = '#fafafa';
    context.fillRect(0, 0, WIDTH, HEIGHT);
    // A fine weave, rather than painted vertical stripes. Lighting supplies folds.
    context.fillStyle = 'rgba(96, 96, 96, .035)';
    for (let x = 0; x < WIDTH; x += 2) context.fillRect(x, 0, 0.45, HEIGHT);
    for (let y = 0; y < HEIGHT; y += 2) context.fillRect(0, y, WIDTH, 0.3);
    menuVibes.forEach((label, index) => {
      const y = 5 + index * 34 + 17;
      context.fillStyle = '#292c33';
      context.font = `${selection === index ? '550' : '400'} 12px ${font}`;
      context.textBaseline = 'middle';
      context.fillText(label, 17, y);
      if (selection === index) {
        context.beginPath();
        context.moveTo(218, y);
        context.lineTo(221, y + 3);
        context.lineTo(227, y - 3);
        context.strokeStyle = '#373b44';
        context.lineWidth = 1.25;
        context.stroke();
      }
    });
    context.strokeStyle = '#e0e0e0';
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(0.5, 0.5, WIDTH - 1, HEIGHT - 1, 9);
    context.stroke();
    context.restore();
    texture.needsUpdate = true;
  }
  paint(selected);
  const geometry = new T.PlaneGeometry(WIDTH, HEIGHT, 36, 52);
  const material = new T.MeshPhysicalMaterial({
    map: texture,
    side: T.DoubleSide,
    transparent: true,
    alphaTest: 0.05,
    roughness: 0.78,
    metalness: 0,
    sheen: 0.35,
    sheenRoughness: 0.8,
    sheenColor: new T.Color('#dedede'),
  });
  const mesh = new T.Mesh(geometry, material);
  scene.add(mesh);
  const position = geometry.getAttribute('position') as Three.BufferAttribute;
  const rows = 52,
    columns = 36;
  let desiredOpen = open,
    length = reduced && open ? HEIGHT : 7,
    velocity = 0;
  let impactTime = -10,
    time = 0,
    frame = 0,
    last = 0,
    disposed = false,
    activeUntil = 0;
  const gravity = 2800,
    tension = 1900,
    damping = 52;
  const springRest = HEIGHT - gravity / tension;
  function updateGeometry() {
    const released = Math.min(HEIGHT, Math.max(0, length));
    const stretch = Math.max(0, length - HEIGHT);
    const age = time - impactTime;
    const impulse = desiredOpen && age >= 0 ? Math.exp(-age * 3.2) : 0;
    for (let row = 0; row <= rows; row++) {
      const v = row / rows,
        s = v * HEIGHT;
      const loose = Math.max(0, s - released);
      for (let col = 0; col <= columns; col++) {
        const u = col / columns;
        const bend = Math.sin(v * 7.5 - age * 13 + u * 2.2) * impulse;
        const pinWeight = Math.sin((v * Math.PI) / 2);
        const packedY =
          loose > 0 ? loose * 0.075 + Math.sin(loose / 7) * 3.4 : 0;
        const packedZ = loose > 0 ? (1 - Math.cos(loose / 7)) * 10 : 0;
        const y =
          Math.min(s, released) +
          packedY +
          stretch * v * v +
          bend * 3.5 * pinWeight;
        // The pinned edge does not move; curvature and highlights travel down.
        const z =
          packedZ +
          bend * 21 * pinWeight +
          Math.sin(u * Math.PI * 5.2 + v * 1.6) *
            (1.4 + impulse * 3) *
            pinWeight;
        const x =
          (u - 0.5) * (WIDTH - Math.min(stretch, 18) * Math.sin(v * Math.PI));
        position.setXYZ(row * (columns + 1) + col, x, -y, z);
      }
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    material.opacity = reduced
      ? desiredOpen
        ? 1
        : 0
      : Math.min(1, Math.max(0, (length - 7) / 10));
    renderer.render(scene, camera);
  }
  function tick(stamp: number) {
    if (disposed) return;
    const dt = Math.min((stamp - (last || stamp)) / 1000, 0.04);
    last = stamp;
    const steps = Math.max(1, Math.ceil(dt / (1 / 180)));
    const step = dt / steps;
    for (let i = 0; i < steps; i++) {
      time += step;
      if (reduced) {
        length = desiredOpen ? HEIGHT : 7;
        velocity = 0;
      } else if (desiredOpen) {
        const previous = length;
        const acceleration =
          gravity -
          (length > springRest
            ? tension * (length - springRest) + damping * velocity
            : velocity * 1.5);
        velocity += acceleration * step;
        length += velocity * step;
        if (previous < springRest && length >= springRest && velocity > 120)
          impactTime = time;
      } else {
        velocity += ((7 - length) * 160 - velocity * 25) * step;
        length = Math.max(5, length + velocity * step);
      }
    }
    updateGeometry();
    if (
      stamp < activeUntil ||
      Math.abs(velocity) > 0.04 ||
      Math.abs(length - (desiredOpen ? HEIGHT : 7)) > 0.03
    )
      frame = requestAnimationFrame(tick);
    else {
      frame = 0;
      last = 0;
    }
  }
  function wake() {
    if (reduced) {
      length = desiredOpen ? HEIGHT : 7;
      velocity = 0;
      updateGeometry();
      return;
    }
    activeUntil = performance.now() + 2400;
    if (!frame) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  }
  updateGeometry();
  wake();
  const fontsReady = document.fonts.ready;
  void fontsReady.then(() => {
    if (!disposed) {
      paint(selected);
      wake();
    }
  });
  return {
    setOpen(value) {
      desiredOpen = value;
      wake();
    },
    setSelection(value) {
      selected = value;
      paint(value);
      wake();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
    },
  };
}

export function SilkSurface({
  open,
  selected,
  reduced,
}: {
  open: boolean;
  selected: number;
  reduced: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const controls = useRef<SilkControls | null>(null);
  const latest = useRef({ open, selected });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    latest.current = { open, selected };
    controls.current?.setOpen(open);
    controls.current?.setSelection(selected);
  }, [open, selected]);
  useEffect(() => {
    let cancelled = false;
    void makeSilk(
      canvas.current!,
      latest.current.open,
      latest.current.selected,
      reduced,
    )
      .then((engine) => {
        if (cancelled) {
          engine.dispose();
          return;
        }
        controls.current = engine;
        engine.setOpen(latest.current.open);
        engine.setSelection(latest.current.selected);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });
    return () => {
      cancelled = true;
      controls.current?.dispose();
      controls.current = null;
    };
  }, [reduced]);
  return (
    <div
      className="mm-silk-surface"
      data-ready={ready}
      data-open={open}
      aria-hidden="true"
    >
      <canvas ref={canvas} />
      {!ready && <div className="mm-silk-fallback" />}
    </div>
  );
}
