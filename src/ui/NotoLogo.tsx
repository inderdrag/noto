import React from 'react';

interface NotoIconProps {
  size?: number;
  className?: string;
  color?: string;
}

/**
 * Noto Brand Icon: Soft purple arch mark
 */
export const NotoIcon: React.FC<NotoIconProps> = ({ 
  size = 28, 
  className = '', 
  color = '#6355C7'
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <path 
        d="M6 19.5V11C6 7.68629 8.68629 5 12 5C15.3137 5 18 7.68629 18 11V19.5" 
        stroke={color} 
        strokeWidth="3" 
        strokeLinecap="round" 
      />
    </svg>
  );
};

interface NotoBrandProps {
  className?: string;
  iconSize?: number;
  showSubtitle?: boolean;
}

export const NotoBrand: React.FC<NotoBrandProps> = ({ 
  className = '', 
  iconSize = 24,
  showSubtitle = false
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <NotoIcon size={iconSize} />
      <div className="flex flex-col">
        <span className="font-bold tracking-tight text-neutral-900 dark:text-white leading-none text-lg">
          Noto
        </span>
        {showSubtitle && (
          <span className="text-[11px] text-neutral-400 font-normal leading-tight mt-0.5">
            Библиотека тетрадей
          </span>
        )}
      </div>
    </div>
  );
};

