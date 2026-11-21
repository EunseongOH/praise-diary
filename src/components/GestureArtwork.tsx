import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';

type Point = { x: number; y: number };
type Transform = { scale: number; x: number; y: number };
type PinchStart = {
  distance: number;
  scale: number;
  anchorX: number;
  anchorY: number;
};
const MIN_SCALE = 1;
const MAX_SCALE = 3.2;
const identity: Transform = { scale: 1, x: 0, y: 0 };
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * A borderless artwork viewer, not a zoom widget.
 * Two-finger pinch is optional. No on-screen zoom controls, badges or hint text.
 * One finger pans only after zooming. Keyboard shortcuts provide an alternate
 * accessible path without adding controls to the art itself.
 */
export function GestureArtwork({ children }: { children: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const artwork = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<PinchStart | null>(null);
  const lastOne = useRef<Point | null>(null);
  const lastTouchY = useRef<number | null>(null);
  const latest = useRef<Transform>(identity);
  const [transform, setTransform] = useState<Transform>(identity);

  function normalize(next: Transform): Transform {
    const box = viewport.current;
    const art = artwork.current;
    const scale = clamp(next.scale, MIN_SCALE, MAX_SCALE);
    if (!box || !art || scale === MIN_SCALE) return identity;
    const limitX = Math.max(0, (art.offsetWidth * scale - box.clientWidth) / 2);
    const limitY = Math.max(0, (art.offsetHeight * scale - box.clientHeight) / 2);
    return { scale, x: clamp(next.x, -limitX, limitX), y: clamp(next.y, -limitY, limitY) };
  }

  function apply(next: Transform) {
    const value = normalize(next);
    latest.current = value;
    setTransform(value);
  }

  function localPoint(event: PointerEvent<HTMLDivElement>): Point {
    const bounds = viewport.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, y: 0 };
    return { x: event.clientX - bounds.left - bounds.width / 2,
      y: event.clientY - bounds.top - bounds.height / 2 };
  }

  function beginPinch() {
    const points = [...pointers.current.values()];
    if (points.length < 2) return;
    const [a, b] = points;
    if (!a || !b) return;
    const center = midpoint(a, b);
    const current = latest.current;
    pinch.current = {
      distance: Math.max(distance(a, b), 1),
      scale: current.scale,
      anchorX: (center.x - current.x) / current.scale,
      anchorY: (center.y - current.y) / current.scale,
    };
    lastOne.current = null;
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, localPoint(event));
    if (pointers.current.size >= 2) { beginPinch(); lastTouchY.current = null; }
    else { lastOne.current = localPoint(event); lastTouchY.current = event.clientY; }
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const point = localPoint(event);
    pointers.current.set(event.pointerId, point);
    const current = latest.current;
    const points = [...pointers.current.values()];
    if (points.length >= 2) {
      if (!pinch.current) beginPinch();
      const start = pinch.current;
      const [a, b] = points;
      if (!start || !a || !b) return;
      const targetScale = clamp(start.scale * distance(a, b) / start.distance, MIN_SCALE, MAX_SCALE);
      const mid = midpoint(a, b);
      apply({ scale: targetScale, x: mid.x - start.anchorX * targetScale,
        y: mid.y - start.anchorY * targetScale });
    } else if (lastOne.current && current.scale > MIN_SCALE) {
      apply({ scale: current.scale, x: current.x + point.x - lastOne.current.x,
        y: current.y + point.y - lastOne.current.y });
      lastOne.current = point;
    } else {
      // One finger on an unzoomed artwork should still scroll the page.
      // touch-action:none is needed to retain both fingers for custom pinch.
      if (event.pointerType === 'touch' && lastTouchY.current != null) {
        window.scrollBy(0, lastTouchY.current - event.clientY);
      }
      lastTouchY.current = event.clientY;
      lastOne.current = point;
    }
  }

  function pointerEnd(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    pinch.current = null;
    lastOne.current = pointers.current.size === 1
      ? [...pointers.current.values()][0] ?? null : null;
    lastTouchY.current = null;
  }

  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    const current = latest.current;
    switch (event.key) {
      case '+': case '=': event.preventDefault(); apply({ ...current, scale: current.scale + 0.25 }); break;
      case '-': event.preventDefault(); apply({ ...current, scale: current.scale - 0.25 }); break;
      case '0': event.preventDefault(); apply(identity); break;
      case 'ArrowLeft': event.preventDefault(); apply({ ...current, x: current.x + 32 }); break;
      case 'ArrowRight': event.preventDefault(); apply({ ...current, x: current.x - 32 }); break;
      case 'ArrowUp': event.preventDefault(); apply({ ...current, y: current.y + 32 }); break;
      case 'ArrowDown': event.preventDefault(); apply({ ...current, y: current.y - 32 }); break;
      default: break;
    }
  }

  return <div ref={viewport} className="gesture-artwork-viewer" role="group" tabIndex={0}
    aria-label="월간 그래픽 감상. 두 손가락으로 확대하고 축소할 수 있습니다. 키보드는 더하기, 빼기, 방향키를 사용할 수 있습니다."
    onPointerDown={pointerDown} onPointerMove={pointerMove}
    onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onKeyDown={keyboard}>
    <div ref={artwork} className="gesture-artwork-viewer__content"
      style={{ transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})` }}>
      {children}
    </div>
  </div>;
}
