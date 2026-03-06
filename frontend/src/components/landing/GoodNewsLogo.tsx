export default function GoodNewsLogo() {
  return (
    <div className="flex flex-col items-center gap-7">
      {/* Animated SVG */}
      <svg
        viewBox="0 0 220 220"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: 180, height: 180, overflow: "visible" }}
      >
        {/* ── SMILEY ── */}
        <circle className="gn-face-circle" cx="110" cy="110" r="88" />
        <circle className="gn-eye" cx="82"  cy="94"  r="9" />
        <circle className="gn-eye" cx="138" cy="94"  r="9" />
        <path   className="gn-smile" d="M 76 128 Q 110 164 144 128" />

        {/* ── NEWSPAPER ── */}
        <rect    className="gn-news-body" x="34" y="48" width="152" height="130" rx="6" />
        <polygon className="gn-news-fold" points="154,48 186,48 186,80" />
        <polygon className="gn-news-fold" points="154,48 186,80 154,80" style={{ fill: "#DDD4B0" }} />
        <rect    className="gn-news-fold" x="34" y="48" width="120" height="26" rx="6"
                 style={{ fill: "#F5C842", stroke: "#1A1207", strokeWidth: 4 }} />
        <text    className="gn-news-headline" x="44" y="67" fontSize="11" fontWeight="900" letterSpacing="0.5">
          GOOD NEWS
        </text>

        {/* divider */}
        <line className="gn-news-line" x1="34" y1="78" x2="186" y2="78" strokeWidth="3.5" />

        {/* body lines */}
        <line className="gn-news-line" x1="44" y1="98"  x2="176" y2="98" />
        <line className="gn-news-line" x1="44" y1="112" x2="176" y2="112" />
        <line className="gn-news-line" x1="44" y1="126" x2="150" y2="126" />

        {/* section divider */}
        <line className="gn-news-line" x1="44" y1="140" x2="176" y2="140"
              style={{ stroke: "#C4B483", strokeWidth: 1.5 }} />

        {/* 2-col lines */}
        <line className="gn-news-line" x1="44"  y1="154" x2="103" y2="154" />
        <line className="gn-news-line" x1="44"  y1="164" x2="103" y2="164" />
        <line className="gn-news-line" x1="117" y1="154" x2="176" y2="154" />
        <line className="gn-news-line" x1="117" y1="164" x2="176" y2="164" />

        {/* easter-egg smile watermark */}
        <path className="gn-news-line"
              d="M 90 88 Q 110 100 130 88"
              style={{ stroke: "#F5C842", strokeWidth: 2, opacity: 0.5 }} />
      </svg>

      {/* Wordmark */}
      <div style={{ textAlign: "center", lineHeight: 1 }}>
        <span className="gn-wordmark-good">Good</span>
        <span className="gn-wordmark-news">News</span>
        <span className="gn-rule" />
      </div>
    </div>
  );
}
