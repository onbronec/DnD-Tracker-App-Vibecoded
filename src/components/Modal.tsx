import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  children: ReactNode;
  className?: string;
}

export function Modal({ children, className = '' }: Props) {
  return createPortal(
    <div className={`modal-backdrop ${className}`} role="dialog" aria-modal="true">
      {children}
    </div>,
    document.body
  );
}
