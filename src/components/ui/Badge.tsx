import clsx from 'clsx'

interface Props {
  children: React.ReactNode
  variant?: 'available' | 'unavailable' | 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'featured' | 'vegetarian' | 'chef' | 'gray'
  className?: string
}

const variants: Record<string, string> = {
  // Reservation / order status
  pending:     'bg-arena-warm text-[#BA7517]',
  confirmed:   'bg-status-free text-[#3B6D11]',
  cancelled:   'bg-coral-light text-coral-dark',
  completed:   'bg-status-cleaning text-[#5F5E5A]',
  // Menu item status
  available:   'bg-status-free text-[#3B6D11]',
  unavailable: 'bg-coral-light text-coral-dark',
  // Menu badges
  featured:    'bg-calipso text-white',
  vegetarian:  'bg-[#3B6D11] text-white',
  chef:        'bg-calipso text-white',
  // Fallback
  gray:        'bg-status-cleaning text-ink-secondary',
}

export default function Badge({ children, variant = 'gray', className }: Props) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      variants[variant] ?? variants.gray,
      className
    )}>
      {children}
    </span>
  )
}
