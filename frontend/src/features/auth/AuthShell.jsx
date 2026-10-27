import "./AuthShell.css";

// Top-down survey of a junction, the way a drone would see it: lane markings,
// a skid mark, two vehicles, and the ground control points (GCPs) used to scale the 3D model.
function SceneGraphic() {
  return (
    <svg
      className="auth__scene"
      viewBox="0 0 640 760"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M40 0H0V40"
            fill="none"
            stroke="#ffffff"
            strokeOpacity=".05"
          />
        </pattern>
      </defs>
      <rect width="640" height="760" fill="url(#grid)" />

      {/* roads */}
      <rect x="0" y="300" width="640" height="150" fill="#1b222c" />
      <rect x="245" y="0" width="150" height="760" fill="#1b222c" />
      <rect x="245" y="300" width="150" height="150" fill="#202833" />
      <g stroke="#f5b301" strokeWidth="3" strokeDasharray="22 18" opacity=".9">
        <path d="M0 375H245M395 375H640" />
        <path d="M320 0V300M320 450V760" />
      </g>
      <g stroke="#ffffff" strokeOpacity=".5" strokeWidth="3">
        <path
          d="M262 290V250M290 290V250M318 290V250M346 290V250M374 290V250"
          opacity="0"
        />
        <path d="M245 300H395M245 450H395" opacity=".25" />
      </g>

      {/* skid marks */}
      <g
        fill="none"
        stroke="#ffffff"
        strokeOpacity=".28"
        strokeWidth="4"
        strokeLinecap="round"
      >
        <path d="M296 120C298 190 300 250 312 322" />
        <path d="M312 120C314 190 316 250 326 322" />
      </g>

      {/* vehicles */}
      <g transform="translate(319 350) rotate(-8)">
        <rect x="-22" y="-44" width="44" height="88" rx="10" fill="#f5b301" />
        <rect
          x="-15"
          y="-26"
          width="30"
          height="20"
          rx="4"
          fill="#12161d"
          opacity=".75"
        />
        <rect
          x="-15"
          y="10"
          width="30"
          height="16"
          rx="4"
          fill="#12161d"
          opacity=".55"
        />
      </g>
      <g transform="translate(442 392) rotate(76)">
        <rect x="-20" y="-40" width="40" height="80" rx="9" fill="#5b6b86" />
        <rect
          x="-13"
          y="-24"
          width="26"
          height="18"
          rx="4"
          fill="#12161d"
          opacity=".7"
        />
        <rect
          x="-13"
          y="8"
          width="26"
          height="14"
          rx="4"
          fill="#12161d"
          opacity=".5"
        />
      </g>

      {/* debris */}
      <g fill="#f5b301" opacity=".75">
        <circle cx="402" cy="352" r="3" />
        <circle cx="412" cy="366" r="2" />
        <circle cx="395" cy="340" r="2" />
      </g>

      {/* ground control points */}
      <g fill="none" stroke="#f5b301" strokeWidth="2">
        {[
          [120, 270],
          [520, 270],
          [120, 480],
          [520, 480],
          [210, 90],
          [430, 660],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            <circle r="11" strokeOpacity=".9" />
            <path d="M-17 0H-6M6 0H17M0 -17V-6M0 6V17" />
          </g>
        ))}
      </g>

      {/* drone flight path */}
      <path
        d="M70 640C160 560 210 600 300 540S470 420 580 470"
        fill="none"
        stroke="#ffffff"
        strokeOpacity=".4"
        strokeWidth="1.5"
        strokeDasharray="3 7"
      />
      <circle cx="580" cy="470" r="5" fill="#ffffff" fillOpacity=".8" />
    </svg>
  );
}

// Split-screen frame shared by the login and registration pages.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <section className="auth__hero">
        <SceneGraphic />
        <div className="auth__hero-copy">
          <div className="auth__brand">
            <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
              <rect width="32" height="32" rx="9" fill="#f5b301" />
              <path
                d="M16 6v4M16 14v4M16 22v4"
                stroke="#12161d"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <span>DAIAS</span>
          </div>
          <h2>Every accident scene, measured from above.</h2>
          <p>
            Upload drone imagery, rebuild the scene in 3D, and hand
            investigators, insurers and police one clear record.
          </p>
        </div>
      </section>

      <section className="auth__panel">
        <div className="auth__card">
          <h1>{title}</h1>
          <p className="auth__sub">{subtitle}</p>
          {children}
          {footer && <div className="auth__footer">{footer}</div>}
        </div>
      </section>
    </div>
  );
}
