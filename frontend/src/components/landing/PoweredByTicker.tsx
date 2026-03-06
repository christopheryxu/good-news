// Dimensions derived from each SVG's viewBox to maintain correct aspect ratios
// Claude:           viewBox 689.98 × 148.18  → h=22, w≈104  (×0.7)
// ElevenLabs:       viewBox 694   ×  90      → h=18, w≈139  (×0.7)
// Google AI Studio: viewBox 299   × 310      → square icon h=30, w≈29  (×0.7)
const LOGOS = [
  { src: "/logos/Claude_AI_logo.svg",        alt: "Claude by Anthropic", width: 104, height: 22, label: null,        href: "https://claude.ai/" },
  { src: "/logos/elevenlabs-logo-black.svg", alt: "ElevenLabs",          width: 139, height: 18, label: null,        href: "https://elevenlabs.io/" },
  { src: "/logos/Google_AI_Studio_icon.svg", alt: "Google Veo",          width: 29,  height: 30, label: "Google Veo", href: "https://aistudio.google.com/" },
];

export default function PoweredByTicker() {
  return (
    <div className="w-full flex flex-col items-center gap-4 mt-12 select-none">
      {/* Static label */}
      <span className="text-xs font-medium text-gray-400 uppercase tracking-widest whitespace-nowrap">
        Powered by
      </span>

      {/* Static logo row */}
      <div className="flex items-center gap-10">
        {LOGOS.map((logo) => {
          const inner = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo.src}
                alt={logo.alt}
                width={logo.width}
                height={logo.height}
                draggable={false}
              />
              {logo.label && (
                <span className="text-xs font-semibold text-gray-800 whitespace-nowrap tracking-tight">
                  {logo.label}
                </span>
              )}
            </>
          );

          return logo.href ? (
            <a
              key={logo.alt}
              href={logo.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center gap-2.5 opacity-60 hover:opacity-100 transition-opacity"
            >
              {inner}
            </a>
          ) : (
            <div
              key={logo.alt}
              className="flex-shrink-0 flex items-center gap-2.5 opacity-60"
            >
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}

