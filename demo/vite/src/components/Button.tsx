import type { ButtonHTMLAttributes } from 'react';

export function Button({ 
  className = '', 
  variant = 'primary', 
  ...props 
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  // Inline styles since we don't have Tailwind
  const styles: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '4px',
    fontWeight: 500,
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    opacity: props.disabled ? 0.6 : 1,
    border: 'none',
    fontSize: '14px',
    marginRight: '8px',
    ...props.style
  };

  if (variant === 'primary') {
    Object.assign(styles, {
      backgroundColor: '#2563eb',
      color: 'white',
    });
  } else if (variant === 'secondary') {
    Object.assign(styles, {
      backgroundColor: '#e5e7eb',
      color: '#374151',
    });
  } else if (variant === 'danger') {
    Object.assign(styles, {
      backgroundColor: '#dc2626',
      color: 'white',
    });
  }

  return <button {...props} style={styles} />;
}
