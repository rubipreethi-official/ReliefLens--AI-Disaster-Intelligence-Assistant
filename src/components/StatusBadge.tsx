import React from 'react';

export type ConnectionStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING';

interface StatusBadgeProps {
  status?: ConnectionStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status = 'ONLINE', 
  className = '' 
}) => {
  const getStyles = () => {
    switch (status) {
      case 'ONLINE':
        return {
          bg: 'bg-[#30D158]/10',
          border: 'border-[#30D158]/20',
          text: 'text-[#30D158]',
          dot: 'bg-[#30D158]',
          pulse: 'bg-[#30D158]/40 animate-ping',
          label: 'Online'
        };
      case 'SYNCING':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          text: 'text-amber-400',
          dot: 'bg-amber-400',
          pulse: 'bg-amber-400/40 animate-pulse',
          label: 'Syncing'
        };
      case 'OFFLINE':
      default:
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/20',
          text: 'text-red-400',
          dot: 'bg-red-400',
          pulse: 'hidden',
          label: 'Offline'
        };
    }
  };

  const styles = getStyles();

  return (
    <div 
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${styles.bg} ${styles.border} transition-all duration-300 ${className}`}
      id="connection-status-badge"
    >
      <div className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full rounded-full ${styles.pulse}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${styles.dot}`} />
      </div>
      <span className={`text-[11px] font-semibold tracking-wide ${styles.text}`}>
        {styles.label}
      </span>
    </div>
  );
};
