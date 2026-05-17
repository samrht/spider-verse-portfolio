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

const router = createBrowserRouter([
  { path: '/', element: <Home /> },

  // Phase 2
  { path: '/suit',  element: locked(2, 'Spider-Suit HUD') },
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
