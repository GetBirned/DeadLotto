import { version } from '../../package.json'

const REPO_URL = 'https://github.com/GetBirned/DeadLotto'
const DBD_URL = 'https://dartbirnie.dev'

export function Footer() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between px-3 pb-2 sm:px-4">
      <a href={DBD_URL} target="_blank" rel="noreferrer" className="pointer-events-auto" aria-label="dartbirnie.dev">
        <img
          src="/assets/branding/DBD_deadLotto.png"
          alt="DBD"
          className="h-5 w-auto opacity-50 transition hover:opacity-90"
        />
      </a>

      <div className="pointer-events-auto flex items-center gap-3 text-dl-text/50">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="View source on GitHub"
          className="transition hover:text-dl-text"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current">
            <path d="M8 0C3.58 0 0 3.67 0 8.2c0 3.62 2.29 6.69 5.47 7.78.4.08.55-.18.55-.39 0-.19-.01-.82-.01-1.49-2.01.38-2.53-.5-2.69-.96-.09-.24-.48-.96-.82-1.16-.28-.15-.68-.53-.01-.54.63-.01 1.08.59 1.23.83.72 1.24 1.87.89 2.33.68.07-.53.28-.89.51-1.1-1.78-.2-3.64-.91-3.64-4.02 0-.89.31-1.62.82-2.19-.08-.2-.36-1.03.08-2.15 0 0 .67-.22 2.2.83a7.5 7.5 0 0 1 4 0c1.53-1.06 2.2-.83 2.2-.83.44 1.12.16 1.95.08 2.15.51.57.82 1.29.82 2.19 0 3.13-1.87 3.82-3.65 4.02.29.26.54.76.54 1.53 0 1.11-.01 2-.01 2.27 0 .21.15.48.55.39A8.21 8.21 0 0 0 16 8.2C16 3.67 12.42 0 8 0Z" />
          </svg>
        </a>
        <span className="text-[11px] tracking-wide">v{version}</span>
      </div>
    </div>
  )
}
