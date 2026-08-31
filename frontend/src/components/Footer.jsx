export default function Footer() {
  return (
    <footer className="border-t border-[#163A5F]/10 bg-mist-deep">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-xs text-ink/50 sm:flex-row sm:items-center sm:justify-between">
        <p>Prithvi &mdash; hackathon prototype. Not an officially validated evacuation system.</p>
        <p className="font-mono">Frontend build · sense → analyze → predict → localize → warn → act</p>
      </div>
    </footer>
  );
}
