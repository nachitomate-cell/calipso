import clsx from 'clsx'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'w-4 h-4', md: 'w-7 h-7', lg: 'w-11 h-11' }

export default function LoadingSpinner({ size = 'md', className }: Props) {
  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <div className={clsx(
        sizes[size],
        'border-2 border-calipso-100 border-t-calipso rounded-full animate-spin'
      )} />
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
      <LoadingSpinner size="lg" />
      <p className="text-calipso-400 text-sm tracking-wider font-body">Cargando…</p>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-card shadow-brand p-5 space-y-3">
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-5/6" />
      <div className="flex justify-between mt-4">
        <div className="skeleton h-4 w-16" />
        <div className="skeleton h-4 w-12" />
      </div>
    </div>
  )
}
