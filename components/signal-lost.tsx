/** Estado de error temático cuando Supabase no responde (SPEC 06). */
export function SignalLost({ className = "" }: { className?: string }) {
  return (
    <div role="alert" className={"p-20 text-center text-ink-faint " + className}>
      <div className="pixel text-[14px] text-magenta">
        ▸ SEÑAL PERDIDA — REINTENTA<span className="blink">_</span>
      </div>
    </div>
  );
}
