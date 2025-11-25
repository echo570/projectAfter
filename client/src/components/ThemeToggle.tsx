import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
      className="relative w-10 h-10 rounded-full overflow-hidden"
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {theme === 'light' ? (
          <Sun 
            className="w-5 h-5 text-amber-500 animate-in fade-in-0 duration-300 absolute"
            style={{
              animation: 'spin-in 0.3s ease-out'
            }}
          />
        ) : (
          <Moon 
            className="w-5 h-5 text-blue-300 animate-in fade-in-0 duration-300 absolute"
            style={{
              animation: 'spin-in 0.3s ease-out'
            }}
          />
        )}
      </div>
      <style>{`
        @keyframes spin-in {
          from {
            transform: rotate(-180deg);
            opacity: 0;
          }
          to {
            transform: rotate(0deg);
            opacity: 1;
          }
        }
      `}</style>
    </Button>
  );
}
