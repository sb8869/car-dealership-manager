import React from 'react';
import { Card, Badge } from './ui';
import { SPACING, COLORS } from '../constants';

export function Toast({ toast, onClose }) {
  const variants = {
    success: 'success',
    info: 'info', 
    warning: 'warning',
    bad: 'error',
    error: 'error'
  };

  const variant = variants[toast.type] || 'info';

  return (
    <Card
      style={{
        position: 'fixed',
        top: SPACING.lg,
        right: SPACING.lg,
        minWidth: 300,
        maxWidth: 400,
        zIndex: 1000,
        animation: 'slideIn 0.3s ease',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        gap: SPACING.sm 
      }}>
        <div style={{ flex: 1 }}>
          <Badge variant={variant} style={{ marginBottom: SPACING.xs }}>
            {toast.type}
          </Badge>
          <div style={{ fontSize: 14 }}>
            {toast.text}
          </div>
        </div>
        <button
          onClick={() => onClose(toast.id)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            color: COLORS.secondary,
            padding: 0,
            lineHeight: 1
          }}
        >
          ✕
        </button>
      </div>
    </Card>
  );
}

export function ToastContainer({ toasts, onRemoveToast }) {
  return (
    <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 1000 }}>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            marginTop: index * (80 + SPACING.sm),
            transition: 'all 0.3s ease'
          }}
        >
          <Toast toast={toast} onClose={onRemoveToast} />
        </div>
      ))}
    </div>
  );
}