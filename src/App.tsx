import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Home } from './pages/Home'

// Phase 1 ships only `/`. The Phase 2/3 routes exist as locked stand-ins so
// the URL surface area is real on day one — every linked portal in the
// LockedPortals section already has somewhere to go. LockedPage is lazy so
// the / route doesn't carry its bytes.
const LockedPage = lazy(() =>
  import('./pages/LockedPage').then((m) => ({ default: m.LockedPage })),
)
// Phase 2: /bugle is now a real broadsheet page (not a locked stub).
const Bugle = lazy(() =>
  import('./pages/Bugle').then((m) => ({ default: m.Bugle })),
)
// Phase 2: /suit is now the live Spider-Suit HUD dashboard.
const Suit = lazy(() =>
  import('./pages/Suit').then((m) => ({ default: m.Suit })),
)

const locked = (phase: 2 | 3, concept: string) => (
  <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#04000a' }} />}>
    <LockedPage phase={phase} concept={concept} />
  </Suspense>
)

const bugleRoute = (
  <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#0a0015' }} />}>
    <Bugle />
  </Suspense>
)

// Suspense bg matches --universe-bg for the default suit mode (earth-928) so
// the fallback doesn't flash a different colour before the page paints.
const suitRoute = (
  <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#020b18' }} />}>
    <Suit />
  </Suspense>
)

const router = createBrowserRouter([
  { path: '/', element: <Home /> },

  // Phase 2
  { path: '/suit',  element: suitRoute },
  { path: '/bugle', element: bugleRoute },
  { path: '/story', element: locked(2, 'The Story') },

  // Phase 3 — locked
  { path: '/mission',    element: locked(3, 'The Mission') },
  { path: '/multiverse', element: locked(3, 'The Multiverse') },
  { path: '/visualizer', element: locked(3, 'Music Visualizer') },
  { path: '/cyber',      element: locked(3, 'CyberSpider') },

  // Fallback — anything else gets the multiverse veil too.
  { path: '*', element: locked(2, 'Unknown Universe') },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
