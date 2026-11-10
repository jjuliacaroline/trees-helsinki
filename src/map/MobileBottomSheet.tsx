import type { ReactNode } from 'react'
import './mobileBottomSheet.css'

interface MobileBottomSheetProps {
  open: boolean
  ariaLabel: string
  onClose: () => void
  children: ReactNode
  showCloseButton?: boolean
}

export function MobileBottomSheet({
  open,
  ariaLabel,
  onClose,
  children,
  showCloseButton = true,
}: MobileBottomSheetProps) {
  if (!open) return null

  return (
    <section className={`mobile-bottom-sheet${showCloseButton ? '' : ' is-closebuttonless'}`} aria-label={ariaLabel}>
      {showCloseButton ? (
        <button
          type="button"
          className="mobile-bottom-sheet__close"
          onClick={onClose}
          aria-label={`Sulje ${ariaLabel.toLocaleLowerCase('fi-FI')}`}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
      <div className="mobile-bottom-sheet__content">{children}</div>
    </section>
  )
}
