import type { ReactNode } from 'react'
import { TopBar } from './TopBar'
import { Footer } from './Footer'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full text-dl-text">
      <video
        className="fixed inset-0 -z-20 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        src="/assets/branding/deadLotto_background.webm"
      />
      <div className="fixed inset-0 -z-10 bg-black/60" />
      <TopBar />
      <main className="relative flex h-screen flex-col items-center justify-center overflow-y-auto px-4 pt-20 pb-4 sm:px-8">
        <div className="w-full">{children}</div>
      </main>
      <Footer />
    </div>
  )
}
