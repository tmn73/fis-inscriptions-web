import {Snowflake} from "lucide-react";

const SNOWFLAKE_COUNT = 35;

// Randomized once when the module loads: render functions must stay pure,
// so Math.random() cannot run while rendering.
const snowflakes = Array.from({length: SNOWFLAKE_COUNT}).map(() => ({
  initialOpacity: Math.random() * 0.4 + 0.2,
  scale: Math.random() * 0.5 + 0.3,
  duration: Math.random() * 12 + 12,
  delay: Math.random() * -20,
  xAmplitude: (Math.random() * 60 + 20) * (Math.random() > 0.5 ? 1 : -1),
  rotation: (Math.random() * 360 + 180) * (Math.random() > 0.5 ? 1 : -1),
  left: Math.random() * 100,
}));

export function Snowfall() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {snowflakes.map((flake, i) => (
        <Snowflake
          key={i}
          className="absolute text-white/80 animate-snowfall"
          style={
            {
              top: "-10%",
              left: `${flake.left}%`,
              "--opacity": flake.initialOpacity,
              "--scale": flake.scale,
              opacity: flake.initialOpacity,
              transform: `scale(${flake.scale})`,
              animationDuration: `${flake.duration}s`,
              animationDelay: `${flake.delay}s`,
              "--x-amplitude": `${flake.xAmplitude}px`,
              "--rotation": `${flake.rotation}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
