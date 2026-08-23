import { Modal } from './Modal'
import { getHero } from '@shared/heroRegistry'

const STEPS = [
  {
    title: 'Host or join a lobby',
    description:
      'Host a lobby and pick how many heroes and challenges to roll, then share the invite code with up to 5 friends - or join one someone shared with you.',
    icon: <img src="/assets/branding/deadLotto_logo.png" alt="" className="h-10 w-10" />,
  },
  {
    title: 'Roll your hero',
    description:
      "Spin the wheel of all 38 Deadlock heroes (plus a wildcard \"your choice\" slot) the number of times your host picked, then lock in the one you're playing.",
    icon: <img src={getHero('wraith').icon} alt="" className="h-10 w-10 rounded-full border border-dl-border" />,
  },
  {
    title: 'Roll your challenge',
    description: 'Get 1-3 random gameplay challenges - item restrictions, playstyle rules, and more to spice up the match.',
    icon: (
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dl-mint/50 bg-dl-mint/10 text-dl-mint">
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
          <path d="M4 4h16v16H4V4Zm4 4v2h2V8H8Zm5 0v2h2V8h-2Zm-5 5v2h2v-2H8Zm5 0v2h2v-2h-2Z" />
        </svg>
      </div>
    ),
  },
  {
    title: 'Play the match',
    description: 'Boot up Deadlock for real and play out your rolled hero and challenge(s) with your team.',
    icon: (
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dl-border bg-black/40 text-dl-text">
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
          <path d="M7 6h10a4 4 0 0 1 4 4v4a3 3 0 0 1-3 3c-.9 0-1.7-.4-2.3-1.1L14 14h-4l-1.7 1.9A3.1 3.1 0 0 1 6 17a3 3 0 0 1-3-3v-4a4 4 0 0 1 4-4Zm1.5 3v1.5H7V12H5.5v-1.5H7V9h1.5Zm7.5 4a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm-2.5-3a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" />
        </svg>
      </div>
    ),
  },
  {
    title: 'Log your stats',
    description:
      'Report win or loss and your kills/deaths/souls. DeadLotto tracks your session record, lifetime stats, and adds you to the leaderboard.',
    icon: (
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dl-mint/50 bg-dl-mint/10 text-dl-mint">
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
          <path d="M14.2 1.2c.6 1.7-.2 3-1.4 4-1.6 1.4-3 2.7-1.8 4.8 1-.3 1.7-1.1 2.1-2.1.9 1.8.4 3.6-.9 4.9-1.7 1.7-1.9 3.5-.6 5.5a5.7 5.7 0 0 0 4.6-8.9c1.6.2 2.7 1.2 3.4 2.6.9-4.4-1.9-8.6-5.4-10.8Zm-4.9 5.3C6.2 8.1 3.8 11 4 14.6a5.9 5.9 0 0 0 8.8 5c-2.1-1.1-2.8-2.8-2.2-5 .5.7 1.2 1.1 2.1 1.2-.6-2.4-2.8-2.9-2.7-5a5.6 5.6 0 0 1 .3-3.3Z" />
        </svg>
      </div>
    ),
  },
]

export function HowItWorksModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} wide>
      <h2 className="mb-1 font-display text-2xl text-dl-text">How DeadLotto Works</h2>
      <p className="mb-6 text-sm text-dl-text/60">A strat-roulette companion for Deadlock, in five steps.</p>

      <div className="flex flex-col gap-4">
        {STEPS.map((step, i) => (
          <div key={step.title} className="flex items-start gap-4 rounded-lg border border-dl-border/60 bg-black/20 p-4">
            <div className="relative shrink-0">
              {step.icon}
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-dl-border bg-dl-panel font-display text-[11px] text-dl-text">
                {i + 1}
              </span>
            </div>
            <div>
              <h3 className="font-display text-dl-text">{step.title}</h3>
              <p className="text-sm text-dl-text/60">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-6 w-full rounded bg-dl-mint py-3 font-display tracking-wide text-black transition hover:brightness-110"
      >
        Got it
      </button>
    </Modal>
  )
}
