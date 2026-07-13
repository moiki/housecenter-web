import { Outlet } from 'react-router-dom'

function BrandLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="size-8 rounded-full bg-brand-solid flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" fill="none" className="size-4 text-white" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
        </svg>
      </div>
      <span className="text-sm font-semibold text-primary">HouseCenter</span>
    </div>
  )
}

function RightPanel() {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center relative overflow-hidden bg-[#5925DC] px-12">
      {/* Subtle dot-grid texture */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Dashboard mockup card */}
      <div className="relative z-10 w-full max-w-sm mb-10">
        <div className="bg-white rounded-2xl shadow-2xl p-5">
          <p className="text-xs font-semibold text-gray-500 mb-3">Pacientes activos</p>

          {/* Fake chart bars */}
          <div className="flex items-end gap-1.5 h-20 mb-3">
            {[40, 65, 50, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${h}%`,
                  background: i === 10 ? '#5925DC' : '#EDE9FE',
                }}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">1,248</p>
              <p className="text-xs text-gray-400">Pacientes este mes</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold bg-emerald-50 px-2 py-1 rounded-full">
              <svg viewBox="0 0 16 16" fill="none" className="size-3" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12V4M4 8l4-4 4 4" />
              </svg>
              +12%
            </div>
          </div>
        </div>

        {/* Floating stat card */}
        <div className="absolute -bottom-6 -right-6 bg-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-3">
          <div className="size-9 rounded-full bg-violet-100 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="size-4 text-[#5925DC]" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m0 0A4 4 0 1113 8a4 4 0 01-4 3.87z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-400">Rutas activas</p>
            <p className="text-sm font-bold text-gray-900">24 rutas</p>
          </div>
        </div>
      </div>

      {/* Heading */}
      <div className="relative z-10 text-center mt-8">
        <h2 className="text-xl font-bold text-white mb-2">
          Gestión integral de pacientes
        </h2>
        <p className="text-sm text-violet-200 max-w-xs">
          Clínicas, rutas domiciliarias, colaboradores y reportes en un solo lugar.
        </p>
      </div>

      {/* Carousel dots */}
      <div className="relative z-10 flex items-center gap-2 mt-8">
        <div className="size-2 rounded-full bg-white" />
        <div className="size-2 rounded-full bg-white/40" />
        <div className="size-2 rounded-full bg-white/40" />
        <div className="size-2 rounded-full bg-white/40" />
      </div>
    </div>
  )
}

export function AuthLayout() {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Left — form panel */}
      <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950">
        {/* Logo */}
        <div className="px-8 pt-8 pb-0">
          <BrandLogo />
        </div>

        {/* Form centered vertically */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </div>

        {/* Copyright */}
        <div className="px-8 pb-8 pt-0">
          <p className="text-xs text-gray-400">
            © HouseCenter {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Right — brand panel (hidden on mobile) */}
      <RightPanel />
    </div>
  )
}
