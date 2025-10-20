// Accessibility utility functions

// Check if user prefers reduced motion
export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Get accessible color contrast ratio
export const getContrastRatio = (color1, color2) => {
  // Simplified contrast ratio calculation
  // In production, use a proper color contrast library
  const getLuminance = (color) => {
    const rgb = color.match(/\d+/g);
    if (!rgb) return 0;
    const [r, g, b] = rgb.map(x => {
      const val = parseInt(x) / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
};

// Generate accessible focus styles
export const getFocusStyles = (variant = 'default') => {
  const baseStyles = 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900';
  
  switch (variant) {
    case 'primary':
      return `${baseStyles} focus:ring-indigo-500`;
    case 'secondary':
      return `${baseStyles} focus:ring-gray-500`;
    case 'danger':
      return `${baseStyles} focus:ring-red-500`;
    case 'success':
      return `${baseStyles} focus:ring-green-500`;
    default:
      return `${baseStyles} focus:ring-indigo-500`;
  }
};

// Generate ARIA labels for common actions
export const getAriaLabels = {
  close: 'Close dialog',
  open: 'Open dialog',
  search: 'Search',
  filter: 'Filter',
  sort: 'Sort',
  loadMore: 'Load more items',
  retry: 'Retry action',
  expand: 'Expand section',
  collapse: 'Collapse section',
  next: 'Next page',
  previous: 'Previous page',
  menu: 'Open menu',
  closeMenu: 'Close menu',
  loading: 'Loading content',
  error: 'Error occurred',
  success: 'Action successful'
};

// Generate accessible button props
export const getButtonProps = (props = {}) => {
  const {
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    ariaLabel,
    ariaDescribedBy,
    ...rest
  } = props;

  return {
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    'aria-disabled': disabled || loading,
    disabled: disabled || loading,
    className: getFocusStyles(variant),
    ...rest
  };
};

// Generate accessible link props
export const getLinkProps = (props = {}) => {
  const {
    href,
    external = false,
    ariaLabel,
    ...rest
  } = props;

  return {
    href,
    'aria-label': ariaLabel,
    target: external ? '_blank' : undefined,
    rel: external ? 'noopener noreferrer' : undefined,
    className: getFocusStyles('primary'),
    ...rest
  };
};

// Generate accessible input props
export const getInputProps = (props = {}) => {
  const {
    id,
    label,
    required = false,
    invalid = false,
    describedBy,
    ...rest
  } = props;

  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const labelId = `${inputId}-label`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;

  return {
    input: {
      id: inputId,
      'aria-labelledby': labelId,
      'aria-describedby': [describedBy, invalid ? errorId : helpId].filter(Boolean).join(' ') || undefined,
      'aria-invalid': invalid,
      'aria-required': required,
      className: getFocusStyles('primary'),
      ...rest
    },
    label: {
      id: labelId,
      htmlFor: inputId
    },
    errorId,
    helpId
  };
};

// Generate accessible modal props
export const getModalProps = (props = {}) => {
  const {
    isOpen,
    onClose,
    title,
    describedBy,
    ...rest
  } = props;

  return {
    'aria-modal': true,
    'aria-labelledby': title ? `${title}-title` : undefined,
    'aria-describedby': describedBy,
    role: 'dialog',
    ...rest
  };
};

// Generate accessible table props
export const getTableProps = (props = {}) => {
  const {
    caption,
    ...rest
  } = props;

  return {
    role: 'table',
    'aria-label': caption,
    ...rest
  };
};

// Generate accessible list props
export const getListProps = (props = {}) => {
  const {
    type = 'list',
    ...rest
  } = props;

  const roleMap = {
    list: 'list',
    navigation: 'navigation',
    menu: 'menu',
    toolbar: 'toolbar'
  };

  return {
    role: roleMap[type] || 'list',
    ...rest
  };
};

// Announce to screen readers
export const announceToScreenReader = (message, priority = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Skip to content link component props
export const getSkipLinkProps = () => ({
  href: '#main-content',
  className: 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg'
});

// Check if element is visible to screen readers
export const isVisibleToScreenReader = (element) => {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         element.getAttribute('aria-hidden') !== 'true';
};

// Generate accessible color combinations
export const getAccessibleColors = {
  primary: {
    text: 'text-white',
    bg: 'bg-indigo-600',
    hover: 'hover:bg-indigo-700',
    focus: 'focus:ring-indigo-500'
  },
  secondary: {
    text: 'text-gray-300',
    bg: 'bg-gray-800',
    hover: 'hover:bg-gray-700',
    focus: 'focus:ring-gray-500'
  },
  success: {
    text: 'text-white',
    bg: 'bg-green-600',
    hover: 'hover:bg-green-700',
    focus: 'focus:ring-green-500'
  },
  danger: {
    text: 'text-white',
    bg: 'bg-red-600',
    hover: 'hover:bg-red-700',
    focus: 'focus:ring-red-500'
  },
  warning: {
    text: 'text-gray-900',
    bg: 'bg-yellow-400',
    hover: 'hover:bg-yellow-500',
    focus: 'focus:ring-yellow-500'
  }
};

export default {
  prefersReducedMotion,
  getContrastRatio,
  getFocusStyles,
  getAriaLabels,
  getButtonProps,
  getLinkProps,
  getInputProps,
  getModalProps,
  getTableProps,
  getListProps,
  announceToScreenReader,
  getSkipLinkProps,
  isVisibleToScreenReader,
  getAccessibleColors
};
