import type { ReactNode } from 'react'
import './mobileBottomSheet.css'

interface MobileBottomSheetProps {
  open: boolean
  ariaLabel: string
  onClose: () => void
  children: ReactNode
  showHandle?: boolean
}

export function MobileBottomSheet({
  open,
  ariaLabel,
  onClose,
  children,
  showHandle = true,
}: MobileBottomSheetProps) {
  if (!open) return null

  return (
    <section className={`mobile-bottom-sheet${showHandle ? '' : ' is-handleless'}`} aria-label={ariaLabel}>
      {showHandle ? (
        <button
          type="button"
          className="mobile-bottom-sheet__handle"
          onClick={onClose}
          aria-label={`Sulje ${ariaLabel.toLocaleLowerCase('fi-FI')}`}
        >
          <span aria-hidden="true" />
        </button>
      ) : null}
      <div className="mobile-bottom-sheet__content">{children}</div>
    </section>
  )
}
