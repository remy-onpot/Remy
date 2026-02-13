import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Shield, Users, BarChart3, Clock, Lock, Eye, Wifi, ChevronRight, Fingerprint, Zap, CheckCircle2 } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ── Header ── */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#0F172A] flex items-center justify-center">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-[#10B981]" strokeWidth={1.5} />
            </div>
            <span className="text-base sm:text-lg font-bold text-[#0F172A]">NimdeQuizzer</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/login">
              <Button variant="outline" size="sm" className="border-[#E2E8F0] text-[#0F172A] text-xs sm:text-sm px-2 sm:px-4">
                <Users className="h-4 w-4 sm:hidden" strokeWidth={1.5} />
                <span className="hidden sm:inline">Lecturer Access</span>
                <span className="sm:hidden">Login</span>
              </Button>
            </Link>
            <Link href="/exam">
              <Button size="sm" className="bg-[#10B981] hover:bg-[#059669] text-white gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                <Shield className="h-4 w-4 sm:hidden" strokeWidth={1.5} />
                <span className="hidden sm:inline">Enter Assessment</span>
                <span className="sm:hidden">Exam</span>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:inline" strokeWidth={1.5} />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
        <div className="max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] text-xs sm:text-sm font-semibold mb-4 sm:mb-6">
            <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-[#10B981]" strokeWidth={1.5} />
            Institutional-grade Platform
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#0F172A] leading-tight mb-4 sm:mb-6">
            Secure<br />
            <span className="text-[#10B981]">Assessment</span><br />
            Platform
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed mb-8 sm:mb-10">
            Multi-layered security with real-time monitoring, offline resilience, and institutional-grade integrity controls. Built for academic institutions that prioritize assessment authenticity.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-[#0F172A] hover:bg-[#1F2937] text-white gap-2 h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
                Lecturer Dashboard
              </Button>
            </Link>
            <Link href="/exam" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-[#E2E8F0] text-[#0F172A] gap-2 h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
                Take Assessment
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6 mt-12 sm:mt-16 md:mt-24 max-w-3xl">
          <div className="p-3 sm:p-4 border border-[#E2E8F0] rounded-lg bg-white">
            <div className="text-2xl sm:text-3xl font-bold text-[#10B981] mb-1">6</div>
            <div className="text-xs sm:text-sm text-slate-600">Security Layers</div>
          </div>
          <div className="p-3 sm:p-4 border border-[#E2E8F0] rounded-lg bg-white">
            <div className="text-2xl sm:text-3xl font-bold text-[#F59E0B] mb-1">10s</div>
            <div className="text-xs sm:text-sm text-slate-600">Heartbeat Interval</div>
          </div>
          <div className="p-3 sm:p-4 border border-[#E2E8F0] rounded-lg bg-white">
            <div className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-1">100%</div>
            <div className="text-xs sm:text-sm text-slate-600">Offline Resilient</div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-px bg-[#E2E8F0]" />
      </div>

      {/* ── Features Grid ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
        <div className="mb-10 sm:mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#0F172A] mb-3 sm:mb-4">
            Six Layers of
            <span className="text-[#10B981]"> Protection</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl">
            Every institutional requirement covered. From browser-level lockdown to server-side verification.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1 — Focus Monitor */}
          <div className="border border-[#E2E8F0] rounded-lg bg-white p-6 hover:shadow-sm transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-[#10B981] bg-opacity-10 flex items-center justify-center mb-4">
              <Eye className="h-6 w-6 text-[#10B981]" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-2">Focus Monitor</h3>
            <p className="text-slate-600 text-sm mb-4">
              Real-time detection of tab switches, window blur, and focus loss.
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#10B981]" />Visibility API tracking</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#10B981]" />Focus/Blur detection</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#10B981]" />Grace period algorithm</li>
            </ul>
          </div>

          {/* Card 2 — Time Warp Detective */}
          <div className="border border-[#E2E8F0] rounded-lg bg-white p-6 hover:shadow-sm transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-[#F59E0B] bg-opacity-10 flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-[#F59E0B]" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-2">Time Detection</h3>
            <p className="text-slate-600 text-sm mb-4">
              Catches app suspension through interval drift detection.
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#F59E0B]" />1-second interval checks</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#F59E0B]" />Mobile-specific protection</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#F59E0B]" />Auto violation flagging</li>
            </ul>
          </div>

          {/* Card 3 — Black Box Recorder */}
          <div className="border border-[#E2E8F0] rounded-lg bg-white p-6 hover:shadow-sm transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-blue-500 bg-opacity-10 flex items-center justify-center mb-4">
              <Wifi className="h-6 w-6 text-blue-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-2">Offline Logging</h3>
            <p className="text-slate-600 text-sm mb-4">
              All activity persists locally. Automatic sync on reconnect.
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-blue-500" />IndexedDB storage</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-blue-500" />Offline event logging</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-blue-500" />Proof string generation</li>
            </ul>
          </div>

          {/* Card 4 — Fullscreen Enforcement */}
          <div className="border border-[#E2E8F0] rounded-lg bg-white p-6 hover:shadow-sm transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-red-500 bg-opacity-10 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-red-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-2">Fullscreen Lock</h3>
            <p className="text-slate-600 text-sm mb-4">
              Enforces fullscreen mode with instant detection and strike accumulation.
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-red-500" />Automatic entry</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-red-500" />Exit detection</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-red-500" />Strike accumulation</li>
            </ul>
          </div>

          {/* Card 5 — Heartbeat Protocol */}
          <div className="border border-[#E2E8F0] rounded-lg bg-white p-6 hover:shadow-sm transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-purple-500 bg-opacity-10 flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-purple-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-2">Heartbeat Protocol</h3>
            <p className="text-slate-600 text-sm mb-4">
              Server-side validation with 10-second pings and battery monitoring.
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-purple-500" />10-second interval</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-purple-500" />Connection tracking</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-purple-500" />Battery monitoring</li>
            </ul>
          </div>

          {/* Card 6 — Live Monitoring */}
          <div className="border border-[#E2E8F0] rounded-lg bg-white p-6 hover:shadow-sm transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-[#10B981] bg-opacity-10 flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-[#10B981]" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-2">Live Monitoring</h3>
            <p className="text-slate-600 text-sm mb-4">
              Real-time dashboard showing every student's status and security events.
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#10B981]" />Status indicators</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#10B981]" />Incident alerts</li>
              <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-[#10B981]" />Force submit</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-px bg-[#E2E8F0]" />
      </div>

      {/* ── How It Works ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#0F172A] text-center mb-12 sm:mb-16 md:mb-20">
          Three Steps to
          <span className="text-[#10B981]"> Secure Assessment</span>
        </h2>

        <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 md:gap-8 max-w-4xl mx-auto">
          {/* Step 1 */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#10B981] bg-opacity-10 flex items-center justify-center mx-auto mb-6 border border-[#10B981] border-opacity-20">
              <span className="text-2xl font-bold text-[#10B981]">1</span>
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-2">Create &amp; Configure</h3>
            <p className="text-slate-600 text-sm">
              Set up questions, upload your roster, and configure security settings.
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#F59E0B] bg-opacity-10 flex items-center justify-center mx-auto mb-6 border border-[#F59E0B] border-opacity-20">
              <span className="text-2xl font-bold text-[#F59E0B]">2</span>
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-2">Students Access</h3>
            <p className="text-slate-600 text-sm">
              Students enter with assessment code and identification. Lockdown activates automatically.
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#0F172A] bg-opacity-10 flex items-center justify-center mx-auto mb-6 border border-[#0F172A] border-opacity-20">
              <span className="text-2xl font-bold text-[#0F172A]">3</span>
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-2">Monitor &amp; Analyze</h3>
            <p className="text-slate-600 text-sm">
              Track in real-time. Review analytics. Export results and integrity reports.
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-px bg-[#E2E8F0]" />
      </div>

      {/* ── CTA Banner ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
        <div className="p-8 sm:p-12 md:p-16 text-center border border-[#E2E8F0] rounded-xl bg-gradient-to-b from-[#F8FAFC] to-white">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#0F172A] mb-3 sm:mb-4">
            Ready to Secure Your Assessments?
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-8 sm:mb-10">
            Start running tamper-proof assessments in minutes. No installation required. Institutional-grade security built in.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-[#0F172A] hover:bg-[#1F2937] text-white gap-2 h-12 sm:h-14 px-8 sm:px-10 text-sm sm:text-base">
                Get Started
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} />
              </Button>
            </Link>
            <Link href="/exam" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-[#E2E8F0] text-[#0F172A] h-12 sm:h-14 px-8 sm:px-10 text-sm sm:text-base">
                Try as Student
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E2E8F0] bg-white py-8 sm:py-12 mt-12 sm:mt-16 md:mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#10B981]" strokeWidth={1.5} />
            <span className="font-bold text-[#0F172A]">NimdeQuizzer</span>
          </Link>
          <div className="flex flex-col items-center sm:items-end gap-1">
            <p className="text-slate-600 text-xs sm:text-sm text-center sm:text-right">
              © {new Date().getFullYear()} NimdeQuizzer. Institutional-Grade Assessment Platform.
            </p>
            <p className="text-slate-500 text-xs">Built for academic integrity.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
