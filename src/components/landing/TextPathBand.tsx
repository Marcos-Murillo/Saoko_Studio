const LINE = 'Bailarines   ·   Grupos   ·   Horarios   ·   Caja   ·   Eventos   ·   Vestuario   ·   Correos   ·   Ajustes   ·   '

export function TextPathBand() {
  const text = LINE.repeat(2)
  return (
    <div className="nx-textpath" aria-hidden>
      <svg viewBox="0 0 1200 150" preserveAspectRatio="xMidYMid slice">
        <defs>
          <path id="nxWave" d="M-40 78 C 160 58, 300 20, 460 78 S 780 98, 940 78 S 1180 58, 1300 78" fill="none" />
        </defs>
        <text fill="#e8c97a" fontSize="24" letterSpacing="0.5" fontWeight="800">
          <textPath href="#nxWave" startOffset="0%">
            {text}
            <animate attributeName="startOffset" from="0%" to="-50%" dur="15s" repeatCount="indefinite" />
          </textPath>
        </text>
      </svg>
    </div>
  )
}
