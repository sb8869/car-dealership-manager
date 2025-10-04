import React, {useEffect, useRef, useState} from "react";

// CooldownRing
// props: remaining (seconds), duration (seconds), size (px), stroke (px)
export default function CooldownRing({remaining=0, duration=60, size=18, stroke=3, color='#28a745', bg='#eee'}){
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const [progress, setProgress] = useState(() => remaining<=0 ? 1 : Math.max(0, Math.min(1, 1 - remaining/duration)));
  const targetRef = useRef(progress);
  const rafRef = useRef(null);

  useEffect(()=>{
    const target = remaining<=0 ? 1 : Math.max(0, Math.min(1, 1 - remaining/duration));
    targetRef.current = target;
    cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const startVal = progress;
    const durationMs = 300; // smooth into new position
    function step(nowTime){
      const t = Math.min(1, (nowTime - start)/durationMs);
      const eased = startVal + (targetRef.current - startVal) * (1 - Math.cos(t * Math.PI)) / 2; // ease-in-out
      setProgress(eased);
      if(t < 1){
        rafRef.current = requestAnimationFrame(step);
      }
    }
    rafRef.current = requestAnimationFrame(step);
    return ()=> cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[remaining,duration]);

  const dash = circumference;
  const offset = Math.round((1 - progress) * dash);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{display:'inline-block',verticalAlign:'middle'}}>
      <circle cx={size/2} cy={size/2} r={radius} stroke={bg} strokeWidth={stroke} fill="none" />
      <circle cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={dash}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{transition:'stroke-dashoffset 120ms linear', transform: 'rotate(-90deg)', transformOrigin: '50% 50%'}}/>
    </svg>
  );
}
