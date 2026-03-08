import { useEffect, useState } from "react";

export function LoadingScreen({ label = "Loading..." }: { label?: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const steps = [
      { target: 30, delay: 80 },
      { target: 60, delay: 120 },
      { target: 80, delay: 200 },
      { target: 92, delay: 400 },
    ];
    let current = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    steps.forEach(({ target, delay }) => {
      const t = setTimeout(() => {
        current = target;
        setProgress(target);
      }, delay);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30">
          <span className="text-white font-sans font-extrabold text-3xl tracking-tight select-none">NX</span>
        </div>
        <span className="text-foreground font-sans font-semibold text-lg tracking-tight">NX-Connect</span>
      </div>

      <div className="w-48 flex flex-col items-center gap-2">
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground font-sans">{label}</span>
      </div>
    </div>
  );
}
