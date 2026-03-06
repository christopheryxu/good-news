// Dimensions derived from each SVG's viewBox to maintain correct aspect ratios at h=32
// Claude:        viewBox 689.98 × 148.18  → w = 32 × (689.98/148.18) ≈ 149
// ElevenLabs:    viewBox 694   ×  90      → w = 26 × (694/90)        ≈ 201  (slightly smaller height)
// Google AI Studio: viewBox 299 × 310     → square icon, render at 32 × 32
const LOGOS = [
  { src: "/logos/Claude_AI_logo.svg",       alt: "Claude by Anthropic", width: Math.round(149 * 0.7), height: Math.round(32 * 0.7), href: "https://claude.ai" },
  { src: "/logos/elevenlabs-logo-black.svg", alt: "ElevenLabs", width: Math.round(201 * 0.7), height: Math.round(26 * 0.7), href: "https://elevenlabs.io" },
  { src: "/logos/Google_AI_Studio_icon.svg", alt: "Google AI Studio", width: Math.round(32 * 0.7),  height: Math.round(32 * 0.7), href: "https://aistudio.google.com" },
];

const GAP = 64; // px between logos

function LogoSet() {
  return (
    <>
      {LOGOS.map((logo) => (
        <a
          key={logo.alt}
          href={logo.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center opacity-60 hover:opacity-100 transition-opacity"
          style={{ marginRight: GAP }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo.src}
            alt={logo.alt}
            width={logo.width}
            height={logo.height}
            draggable={false}
          />
        </a>
      ))}
    </>
  );
}

export default function PoweredByTicker() {
  return (
    <div className="w-full flex flex-col items-center gap-4 mt-12 select-none">
      {/* Static label */}
      <span className="text-xs font-medium text-gray-400 uppercase tracking-widest whitespace-nowrap">
        Powered by
      </span>

      {/* Scrolling strip */}
      <div className="w-full max-w-sm overflow-hidden relative">
        {/* Fade masks */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        {/* Marquee track — duplicated for seamless loop */}
        <div className="flex animate-marquee">
          <LogoSet />
          <LogoSet />
        </div>
      </div>
    </div>
  );
}
