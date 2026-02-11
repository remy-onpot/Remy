import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Users, BarChart3, Clock, Lock, Eye, Wifi } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Midsem</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Lecturer Login</Button>
            </Link>
            <Link href="/exam">
              <Button>Take Exam</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          Secure Online Examination
          <span className="text-primary block">Platform</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          A professional-grade examination system with advanced anti-cheating features, 
          real-time monitoring, and offline-first architecture designed for institutions worldwide.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button size="lg" className="gap-2">
              <Users className="h-5 w-5" />
              Lecturer Dashboard
            </Button>
          </Link>
          <Link href="/exam">
            <Button size="lg" variant="outline" className="gap-2">
              <Shield className="h-5 w-5" />
              Enter Exam Room
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Security Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Eye className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Focus Monitor</CardTitle>
              <CardDescription>
                Detects tab switching, window blur, and mouse leaving the viewport
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Visibility API tracking</li>
                <li>• Focus/Blur detection</li>
                <li>• Mouse leave events</li>
                <li>• Grace period algorithm</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Time Warp Detective</CardTitle>
              <CardDescription>
                Detects when the app is suspended on mobile devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 1-second interval checks</li>
                <li>• Detects app suspension</li>
                <li>• Mobile-specific protection</li>
                <li>• Automatic violation flagging</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Wifi className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Black Box Recorder</CardTitle>
              <CardDescription>
                Records all activity locally when offline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• IndexedDB storage</li>
                <li>• Offline event logging</li>
                <li>• Automatic sync on reconnect</li>
                <li>• Proof string generation</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Lock className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Fullscreen Enforcement</CardTitle>
              <CardDescription>
                Locks the exam in fullscreen mode
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Automatic fullscreen entry</li>
                <li>• Exit detection</li>
                <li>• Immediate re-entry</li>
                <li>• Strike accumulation</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Heartbeat Protocol</CardTitle>
              <CardDescription>
                Server-side validation of client connection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 10-second ping interval</li>
                <li>• Connection status tracking</li>
                <li>• Automatic flagging</li>
                <li>• Battery level monitoring</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Live Monitoring</CardTitle>
              <CardDescription>
                Real-time dashboard for invigilators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Student status indicators</li>
                <li>• Focus state tracking</li>
                <li>• Security incident alerts</li>
                <li>• Force submit capability</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16 bg-white/50">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="font-semibold mb-2">Lecturer Creates Quiz</h3>
            <p className="text-muted-foreground text-sm">
              Set up questions, upload roster, and configure security settings
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="font-semibold mb-2">Students Join</h3>
            <p className="text-muted-foreground text-sm">
              Students enter with quiz code and index number validation
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="font-semibold mb-2">Monitor & Analyze</h3>
            <p className="text-muted-foreground text-sm">
              Track progress in real-time and review detailed analytics
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 Midsem Exam Platform. Built for secure online assessments.</p>
        </div>
      </footer>
    </div>
  )
}
