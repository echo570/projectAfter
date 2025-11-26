import { Wifi, WifiOff } from "lucide-react";
import { createPortal } from "react-dom";

export interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return createPortal(
    <div className="fixed top-4 right-4 z-[9999]" data-testid="connection-status-icon" style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 9999 }}>
      {isConnected ? (
        <Wifi className="w-6 h-6 text-green-500 drop-shadow-lg" data-testid="wifi-icon-connected" style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))' }} />
      ) : (
        <WifiOff className="w-6 h-6 text-red-500 drop-shadow-lg" data-testid="wifi-icon-disconnected" style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))' }} />
      )}
    </div>,
    document.body
  );
}
