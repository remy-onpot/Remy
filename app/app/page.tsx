import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Shield, Users, BarChart3, Clock, Lock, Eye, Wifi, ChevronRight, Fingerprint, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="landing-grain min-h-screen bg-[#07070e] text-white overflow-hidden">

      {/* ── Atmospheric background ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Top-left warm gradient */}
        <div className="absolute -top-[40%] -left-[20%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle,rgba(0,255,170,0.07)_0%,transparent_70%)]" />
        {/* Bottom-right cool gradient */}
        <div className="absolute -bottom-[30%] -right-[15%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle,rgba(80,120,255,0.05)_0%,transparent_70%)]" />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 border-b border-white/[0.06] backdrop-blur-xl bg-[#07070e]/60 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
              <Shield className="h-5 w-5 text-[#07070e]" />
            </div>
            <span className="text-xl font-semibold tracking-tight"><span className="text-white">Nimde</span><span className="text-orange-400">Quizzer</span></span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors">
                Lecturer Login
              </Button>
            </Link>
            <Link href="/exam">
              <Button className="bg-emerald-500 hover:bg-emerald-400 text-[#07070e] font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all">
                Take Exam
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24">
        <div className="max-w-4xl">
          {/* Overline badge */}
          <div className="animate-fade-up stagger-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400 text-sm font-medium mb-8">
            <Fingerprint className="h-3.5 w-3.5" />
            Built for integrity
          </div>

          {/* Headline — editorial serif */}
          <h1 className="animate-fade-up stagger-2 font-[family-name:var(--font-instrument)] text-6xl sm:text-7xl lg:text-8xl leading-[0.95] tracking-tight mb-8">
            Exams that
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400">
              cannot be
            </span>
            <br />
            compromised.
          </h1>

          {/* Subheadline */}
          <p className="animate-fade-up stagger-3 text-lg sm:text-xl text-white/50 max-w-xl leading-relaxed mb-12">
            A lockdown-grade examination platform with real-time monitoring,
            offline-first architecture, and multi-layered anti-cheat — built
            for institutions that take assessment seriously.
          </p>

          {/* CTAs */}
          <div className="animate-fade-up stagger-4 flex flex-wrap gap-4">
            <Link href="/login">
              <Button size="lg" className="bg-white text-[#07070e] hover:bg-white/90 font-semibold h-14 px-8 text-base shadow-2xl shadow-white/10 hover:shadow-white/20 transition-all">
                <Users className="h-5 w-5 mr-2" />
                Lecturer Dashboard
              </Button>
            </Link>
            <Link href="/exam">
              <Button size="lg" variant="outline" className="border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.06] text-white font-semibold h-14 px-8 text-base backdrop-blur-sm transition-all">
                <Shield className="h-5 w-5 mr-2" />
                Enter Exam Room
              </Button>
            </Link>
          </div>
        </div>

        {/* Floating stats — right side */}
        <div className="hidden lg:flex flex-col gap-4 absolute right-6 top-40">
          <div className="animate-fade-in stagger-5 animate-float w-48 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-xl">
            <div className="text-3xl font-bold text-emerald-400 mb-1">6</div>
            <div className="text-sm text-white/40">Security layers active</div>
          </div>
          <div className="animate-fade-in stagger-6 animate-float w-48 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-xl" style={{ animationDelay: '1s' }}>
            <div className="text-3xl font-bold text-white mb-1">10s</div>
            <div className="text-sm text-white/40">Heartbeat interval</div>
          </div>
          <div className="animate-fade-in stagger-7 animate-float w-48 p-5 rounded-2xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-xl" style={{ animationDelay: '2s' }}>
            <div className="text-3xl font-bold text-teal-400 mb-1">100%</div>
            <div className="text-sm text-white/40">Offline resilient</div>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      </div>

      {/* ── Features Grid ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-28">
        <div className="mb-16">
          <h2 className="animate-fade-up font-[family-name:var(--font-instrument)] text-4xl sm:text-5xl tracking-tight mb-4">
            Six layers of
            <span className="text-emerald-400"> defense</span>
          </h2>
          <p className="text-white/40 text-lg max-w-lg">
            Every angle covered. Every loophole sealed. From browser-level lockdown to server-side verification.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1 — Focus Monitor */}
          <div className="feature-card animate-fade-up stagger-1 group rounded-2xl bg-white/[0.02] p-7 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-5 group-hover:bg-emerald-500/20 transition-colors">
              <Eye className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Focus Monitor</h3>
            <p className="text-white/40 text-sm leading-relaxed mb-4">
              Detects tab switches, window blur, and mouse leaving the viewport in real-time.
            </p>
            <ul className="space-y-1.5 text-sm text-white/30">
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-emerald-500" />Visibility API tracking</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-emerald-500" />Focus/Blur detection</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-emerald-500" />Grace period algorithm</li>
            </ul>
          </div>

          {/* Card 2 — Time Warp Detective */}
          <div className="feature-card animate-fade-up stagger-2 group rounded-2xl bg-white/[0.02] p-7 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-5 group-hover:bg-amber-500/20 transition-colors">
              <Clock className="h-6 w-6 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Time Warp Detective</h3>
            <p className="text-white/40 text-sm leading-relaxed mb-4">
              Catches app suspension on mobile devices through interval drift detection.
            </p>
            <ul className="space-y-1.5 text-sm text-white/30">
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-amber-500" />1-second interval checks</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-amber-500" />Mobile-specific protection</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-amber-500" />Auto violation flagging</li>
            </ul>
          </div>

          {/* Card 3 — Black Box Recorder */}
          <div className="feature-card animate-fade-up stagger-3 group rounded-2xl bg-white/[0.02] p-7 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center mb-5 group-hover:bg-sky-500/20 transition-colors">
              <Wifi className="h-6 w-6 text-sky-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Black Box Recorder</h3>
            <p className="text-white/40 text-sm leading-relaxed mb-4">
              All activity persists locally when offline. Automatic sync on reconnect.
            </p>
            <ul className="space-y-1.5 text-sm text-white/30">
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-sky-500" />IndexedDB storage</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-sky-500" />Offline event logging</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-sky-500" />Proof string generation</li>
            </ul>
          </div>

          {/* Card 4 — Fullscreen Enforcement */}
          <div className="feature-card animate-fade-up stagger-4 group rounded-2xl bg-white/[0.02] p-7 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center mb-5 group-hover:bg-rose-500/20 transition-colors">
              <Lock className="h-6 w-6 text-rose-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Fullscreen Lockdown</h3>
            <p className="text-white/40 text-sm leading-relaxed mb-4">
              Enforces fullscreen mode with instant re-entry and strike accumulation.
            </p>
            <ul className="space-y-1.5 text-sm text-white/30">
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-rose-500" />Automatic fullscreen entry</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-rose-500" />Exit detection</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-rose-500" />Strike accumulation</li>
            </ul>
          </div>

          {/* Card 5 — Heartbeat Protocol */}
          <div className="feature-card animate-fade-up stagger-5 group rounded-2xl bg-white/[0.02] p-7 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-5 group-hover:bg-violet-500/20 transition-colors">
              <Zap className="h-6 w-6 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Heartbeat Protocol</h3>
            <p className="text-white/40 text-sm leading-relaxed mb-4">
              Server-side client validation with 10-second pings and battery monitoring.
            </p>
            <ul className="space-y-1.5 text-sm text-white/30">
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-violet-500" />10-second ping interval</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-violet-500" />Connection tracking</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-violet-500" />Battery level monitoring</li>
            </ul>
          </div>

          {/* Card 6 — Live Monitoring */}
          <div className="feature-card animate-fade-up stagger-6 group rounded-2xl bg-white/[0.02] p-7 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-5 group-hover:bg-emerald-500/20 transition-colors">
              <BarChart3 className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Live Monitoring</h3>
            <p className="text-white/40 text-sm leading-relaxed mb-4">
              Real-time dashboard showing every student&apos;s focus state and security events.
            </p>
            <ul className="space-y-1.5 text-sm text-white/30">
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-emerald-500" />Status indicators</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-emerald-500" />Security incident alerts</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-emerald-500" />Force submit capability</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-28">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-28" />

        <h2 className="animate-fade-up font-[family-name:var(--font-instrument)] text-4xl sm:text-5xl tracking-tight text-center mb-20">
          Three steps to a
          <span className="text-emerald-400"> secure exam</span>
        </h2>

        <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          {/* Step 1 */}
          <div className="animate-fade-up stagger-1 text-center group">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 group-hover:border-emerald-500/40 transition-colors">
              <span className="font-[family-name:var(--font-instrument)] text-4xl text-emerald-400">1</span>
            </div>
            <h3 className="text-lg font-semibold mb-3">Create &amp; Configure</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              Set up questions, upload your class roster, and configure security preferences.
            </p>
          </div>

          {/* Step 2 */}
          <div className="animate-fade-up stagger-2 text-center group">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center mx-auto mb-6 group-hover:border-white/20 transition-colors">
              <span className="font-[family-name:var(--font-instrument)] text-4xl text-white/80">2</span>
            </div>
            <h3 className="text-lg font-semibold mb-3">Students Join</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              Students enter with a quiz code and validated index number. Lockdown activates automatically.
            </p>
          </div>

          {/* Step 3 */}
          <div className="animate-fade-up stagger-3 text-center group">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-500/5 border border-teal-500/20 flex items-center justify-center mx-auto mb-6 group-hover:border-teal-500/40 transition-colors">
              <span className="font-[family-name:var(--font-instrument)] text-4xl text-teal-400">3</span>
            </div>
            <h3 className="text-lg font-semibold mb-3">Monitor &amp; Analyze</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              Track progress live. Review detailed analytics. Export results and integrity reports.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-28">
        <div className="animate-glow rounded-3xl bg-gradient-to-br from-emerald-500/[0.08] to-teal-500/[0.04] border border-emerald-500/20 p-12 sm:p-16 text-center backdrop-blur-xl">
          <h2 className="font-[family-name:var(--font-instrument)] text-4xl sm:text-5xl tracking-tight mb-5">
            Ready to secure your exams?
          </h2>
          <p className="text-white/40 text-lg mb-10 max-w-md mx-auto">
            Start running tamper-proof assessments in minutes. No installation required.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-[#07070e] font-semibold h-14 px-10 text-base shadow-2xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all">
                Get Started
                <ChevronRight className="h-5 w-5 ml-1" />
              </Button>
            </Link>
            <Link href="/exam">
              <Button size="lg" variant="outline" className="border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.06] text-white font-semibold h-14 px-10 text-base transition-all">
                Try as Student
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white/30 text-sm">
            <Shield className="h-4 w-4" />
            <span><span className="text-white/50">Nimde</span><span className="text-orange-400/50">Quizzer</span></span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-white/20 text-sm">
              © {new Date().getFullYear()} Built for institutions that take integrity seriously.
            </p>
            <p className="text-white/15 text-xs tracking-wide">Powered by <span className="text-orange-400/40">Nimde AI</span>™</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
