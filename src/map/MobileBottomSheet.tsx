import type { ReactNode } from 'react'
import './mobileBottomSheet.css'

interface MobileBottomSheetProps {
  open: boolean
  ariaLabel: string
  onClose: () => void
  children: ReactNode
}

export function MobileBottomSheet({
  open,
  ariaLabel,
  onClose,
  children,
}: MobileBottomSheetProps) {
  if (!open) return null

  return (
    <section className="mobile-bottom-sheet" aria-label={ariaLabel}>
      <button
        type="button"
        className="mobile-bottom-sheet__handle"
        onClick={onClose}
        aria-label={`Sulje ${ariaLabel.toLocaleLowerCase('fi-FI')}`}
      >
        <span aria-hidden="true" />
      </button>
      <div className="mobile-bottom-sheet__content">{children}</div>
    </section>
  )
}
