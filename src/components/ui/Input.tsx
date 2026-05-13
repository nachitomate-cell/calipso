import clsx from 'clsx'
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: React.ReactNode
}

const label = 'block text-[13px] font-medium text-calipso-700 uppercase tracking-[0.08em] mb-1'
const base = 'w-full rounded-input border border-calipso-200 px-4 py-2.5 text-sm text-ink placeholder:text-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-calipso focus:border-transparent transition-all duration-200 bg-white'

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label: lbl, error, className, ...props }, ref) => (
    <div className="space-y-1">
      {lbl && <label className={label}>{lbl}</label>}
      <input ref={ref} className={clsx(base, error && 'border-coral', className)} {...props} />
      {error && <p className="text-xs text-coral mt-1">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label: lbl, error, className, ...props }, ref) => (
    <div className="space-y-1">
      {lbl && <label className={label}>{lbl}</label>}
      <textarea ref={ref} className={clsx(base, 'resize-none', error && 'border-coral', className)} {...props} />
      {error && <p className="text-xs text-coral mt-1">{error}</p>}
    </div>
  )
)
TextArea.displayName = 'TextArea'

export function Select({ label: lbl, error, children, className, ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {lbl && <label className={label}>{lbl}</label>}
      <select className={clsx(base, 'bg-white cursor-pointer', error && 'border-coral', className)} {...props}>
        {children}
      </select>
      {error && <p className="text-xs text-coral mt-1">{error}</p>}
    </div>
  )
}
