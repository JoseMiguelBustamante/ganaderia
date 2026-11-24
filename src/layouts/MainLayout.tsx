import { Outlet } from 'react-router-dom'

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-cream-100 text-ink-900">
      <Outlet />
    </div>
  )
}
