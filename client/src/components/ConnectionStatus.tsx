import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <div className="fixed top-4 right-4 z-50" data-testid="connection-status-icon">
      {isConnected ? (
        <Wifi className="w-6 h-6 text-green-500" data-testid="wifi-icon-connected" />
      ) : (
        <WifiOff className="w-6 h-6 text-red-500" data-testid="wifi-icon-disconnected" />
      )}
    </div>
  );
}
