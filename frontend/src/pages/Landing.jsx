import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Globe from '../components/Globe';
import { PIPELINE_STAGES, LOCATIONS } from '../data/mockData';

gsap.registerPlugin(ScrollTrigger);

const REVEAL_THRESHOLD = 0.96;
const TEXT_FADE_END = 0.4; // text is fully gone by 40% through the scroll track

export default function Landing() {
  const rootRef = useRef(null);
  const trackRef = useRef(null); // tall scroll track behind the pinned globe
  const textRef = useRef(null); // hero text overlay, mutated directly for perf
  const cueRef = useRef(null);
  const zoomProgressRef = useRef(0);
  const revealedRef = useRef(false);
  const [revealed, setRevealed] = useState(false);

  // Drives the zoom-out + text fade purely from native scroll position, at
  // animation-frame rate. Kept out of React state (except the rare reveal
  // flip) so it stays smooth without re-rendering the tree every frame.
  useEffect(() => {
    let rafId;

    const tick = () => {
      const track = trackRef.current;
      if (track) {
        const rect = track.getBoundingClientRect();
        const scrollable = track.offsetHeight - window.innerHeight;
        const progress = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
        zoomProgressRef.current = progress;

        if (textRef.current) {
          const textProgress = Math.min(1, progress / TEXT_FADE_END);
          textRef.current.style.opacity = String(1 - textProgress);
          textRef.current.style.transform = `translateY(${-textProgress * 50}px)`;
        }
        if (cueRef.current) {
          cueRef.current.style.opacity = String(Math.max(0, 1 - progress / 0.15));
        }

        const shouldReveal = progress > REVEAL_THRESHOLD;
        if (shouldReveal !== revealedRef.current) {
          revealedRef.current = shouldReveal;
          setRevealed(shouldReveal);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero-eyebrow', { opacity: 0, y: 12, duration: 0.6 })
        .from('.hero-title-line', { opacity: 0, y: 24, duration: 0.8 }, '-=0.3')
        .from('.hero-sub', { opacity: 0, y: 14, duration: 0.6 }, '-=0.4')
        .from('.hero-cta', { opacity: 0, y: 10, duration: 0.5 }, '-=0.4')
        .from('.scroll-cue', { opacity: 0, duration: 0.5 }, '-=0.2');

      gsap.from('.globe-instructions', {
        opacity: 0,
        y: 16,
        duration: 0.6,
        ease: 'power2.out',
      });

      gsap.utils.toArray('.stage-card').forEach((card, i) => {
        gsap.from(card, {
          opacity: 0,
          y: 40,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: card, start: 'top 85%' },
          delay: i * 0.03,
        });
      });

      gsap.from('.stat-item', {
        opacity: 0,
        y: 20,
        stagger: 0.1,
        duration: 0.6,
        scrollTrigger: { trigger: '.stats-strip', start: 'top 80%' },
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef}>
      {/* Tall scroll track. The globe stays pinned (CSS sticky) inside it while
          the user scrolls; scroll position within this track drives the
          zoom-out and text fade. It releases into normal flow afterward. */}
      <section ref={trackRef} className="relative" style={{ height: '260vh' }}>
        <div className="sticky top-0 h-screen w-full overflow-hidden bg-void">
        <div className="absolute left-0 top-0 z-[5] h-full w-1/4 cursor-ns-resize"></div>
          <div className="absolute right-0 top-0 z-[5] h-full w-1/4 cursor-ns-resize"></div>
          <Globe
            className="absolute inset-0 z-0 h-full w-full"
            zoomProgressRef={zoomProgressRef}
            interactive={revealed}
          />

          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-void/60 via-transparent to-void" />

          <div
            ref={textRef}
            className="pointer-events-none relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
          >
            <p className="hero-eyebrow font-mono text-xs uppercase tracking-[0.3em] text-electric/80">
              Hyper-local early warning
            </p>
            <h1 className="hero-title-line mt-5 font-display text-6xl tracking-tight text-mist sm:text-7xl">
              Prithvi
            </h1>
            <p className="hero-sub mt-5 max-w-md text-base leading-relaxed text-mist/60">
              Don&apos;t just predict the disaster. Locate it. Warn it. Help people act on it.
            </p>
            <div className="hero-cta pointer-events-auto mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/dashboard"
                className="rounded-full bg-electric px-6 py-3 text-sm font-semibold text-void transition-transform hover:scale-105"
              >
                Open the dashboard
              </Link>
            </div>
          </div>

          <div
            ref={cueRef}
            className="scroll-cue pointer-events-none absolute inset-x-0 bottom-8 z-10 flex flex-col items-center gap-2 text-mist/40"
          >
            <span className="text-[11px] uppercase tracking-[0.25em]">Scroll to reveal the globe</span>
            <svg width="16" height="24" viewBox="0 0 16 24" className="animate-bounce">
              <path d="M8 0v20M2 14l6 6 6-6" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>

          {revealed && (
            <div className="globe-instructions pointer-events-none absolute inset-x-0 top-12 z-10 flex flex-col items-center text-center text-mist">
              <p className="font-display text-2xl">Explore the risk map</p>
              <p className="mt-1 max-w-sm text-sm text-mist/50">
                Drag to rotate. Click a marker to open that village&apos;s live risk view.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="stats-strip border-y border-[#163A5F]/10 bg-mist-deep">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {[
            { value: `${LOCATIONS.length}`, label: 'Villages monitored (pilot)' },
            { value: '60–120 min', label: 'Typical estimated lead time' },
            { value: '5', label: 'Live data sources fused' },
            { value: '24/7', label: 'Simulated sensor stream' },
          ].map((s) => (
            <div key={s.label} className="stat-item">
              <p className="font-display text-3xl text-[#163A5F]">{s.value}</p>
              <p className="mt-1 text-xs text-ink/55">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PIPELINE */}
      <section id="pipeline" className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-moss-deep">
            The pipeline
          </p>
          <h2 className="mt-3 font-display text-3xl text-[#163A5F] sm:text-4xl">
            Sense &rarr; Analyze &rarr; Predict &rarr; Localize &rarr; Warn &rarr; Act
          </h2>
          <p className="mt-4 text-ink/65">
            Every alert Prithvi sends has travelled this exact path &mdash; from a raw
            rain-gauge reading to a resident being told which shelter to walk to.
          </p>
        </div>

        <ol className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE_STAGES.map((stage, i) => (
            <li
              key={stage.key}
              className="stage-card rounded-2xl border border-[#163A5F]/10 bg-white/60 p-6 shadow-sm"
            >
              <span className="font-mono text-xs text-moss-deep">
                0{i + 1}
              </span>
              <h3 className="mt-2 font-display text-xl text-[#163A5F]">{stage.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{stage.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* CLOSING CTA */}
      <section className="bg-[#163A5F] text-mist">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-16 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl">
              See the full pipeline run, live.
            </h2>
            <p className="mt-2 max-w-md text-mist/70">
              Use the simulation page to raise rainfall and soil moisture and
              watch risk, alerts, and shelter guidance update in real time.
            </p>
          </div>
          <Link
            to="/simulation"
            className="shrink-0 rounded-full bg-mist px-6 py-3 text-sm font-semibold text-[#163A5F] transition-transform hover:scale-105"
          >
            Try the simulation
          </Link>
        </div>
      </section>
    </div>
  );
}
