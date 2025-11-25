import { Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";

interface WaitingScreenProps {
  onCancel: () => void;
  language: Language;
}

export function WaitingScreen({ onCancel, language }: WaitingScreenProps) {
  const { t } = useTranslation(language);
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center z-50">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
      </div>

      <div className="relative text-center space-y-8 px-4 max-w-md">
        {/* Loading Animation */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Outer rotating rings */}
            <div className="absolute inset-0 w-28 h-28 border-2 border-transparent border-t-primary rounded-full animate-spin" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-2 w-24 h-24 border-2 border-transparent border-r-primary/60 rounded-full animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
            
            {/* Inner pulse */}
            <div className="absolute inset-4 w-20 h-20 flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse" />
                <div className="relative flex items-center justify-center w-20 h-20 bg-white dark:bg-slate-800 rounded-full shadow-lg">
                  <Search className="w-8 h-8 text-primary animate-pulse" style={{ animationDuration: '2s' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-primary/10 p-8 space-y-6">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-foreground">
              {t('chat.partner.finding')}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connecting you with someone awesome...
            </p>
          </div>

          {/* Animated dots progress */}
          <div className="flex justify-center items-center gap-2 py-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary/60"
                style={{
                  animation: `pulse 1.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-2xl font-bold text-primary">1000+</p>
              <p className="text-xs text-muted-foreground">Online Now</p>
            </div>
            <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
              <div className="flex items-center gap-1 justify-center">
                <Zap className="w-5 h-5 text-accent" />
                <p className="text-2xl font-bold text-accent">5s</p>
              </div>
              <p className="text-xs text-muted-foreground">Avg Wait</p>
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        <Button
          variant="outline"
          onClick={onCancel}
          data-testid="button-cancel-matching"
          className="rounded-lg px-8 font-semibold"
        >
          Cancel
        </Button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
