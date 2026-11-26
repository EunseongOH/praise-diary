/**
 * Home / detail / collection-tile snowflake: the ported Gate 2I I3 renderer (RefineCanvas, unchanged) on the Gate 3B R3
 * state of the month. `live` = the I3 idle motion (20 s strand exchange, Living Core, H3 light) runs while the artwork is on
 * screen and the tab is visible; otherwise the clock is paused (no rAF). Tiles are always still frames.
 */
import { useEffect, useRef, useState } from 'react';
import { RefineCanvas } from './core/h3Refinement/RefineCanvas';
import { CX, CY } from './core/fullSnowflake/engine';
import type { Snap } from './core/snowflakeGrowthReplay/snapshots';
import { PresentationClock, newStats } from './clock';
import { registerClock } from './reviewHooks';

export function SnowflakeStatic({ snap, live, label }: { snap: Snap; live: boolean; label: string }) {
  const [clock] = useState(() => new PresentationClock(newStats()));
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => clock.attach(), [clock]);
  useEffect(() => registerClock(clock), [clock]);
  useEffect(() => {
    if (!live) { clock.pause(); return; }
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') { clock.play(); return () => clock.pause(); }
    const io = new IntersectionObserver(([en]) => { if (en?.isIntersecting && document.visibilityState === 'visible') clock.play(); else clock.pause(); });
    io.observe(el);
    return () => { io.disconnect(); clock.pause(); };
  }, [clock, live]);
  return <div ref={box} className="snowflake-artwork" data-snowflake="static" data-live={live ? 'on' : 'off'}>
    <RefineCanvas is={snap.is} clock={clock} zoom={1} fx={CX} fy={CY} debug="off" render="optimized" label={label} />
  </div>;
}
