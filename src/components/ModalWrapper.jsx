import React from 'react';
import { SPACING, FONT_WEIGHTS } from '../constants';

export default function ModalWrapper({ isOpen, onClose, title, width = 'min(900px, 92vw)', children }) {
  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="card" style={{ position: 'relative', width }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <h3 style={{ margin: 0, fontWeight: FONT_WEIGHTS.bold }}>{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              fontWeight: FONT_WEIGHTS.bold
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ marginTop: SPACING.md }}>
          {children}
        </div>
      </div>
    </div>
  );
}