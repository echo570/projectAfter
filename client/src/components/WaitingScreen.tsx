import { Utensils, ChefHat, Pizza, Salad, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";

interface WaitingScreenProps {
  onCancel: () => void;
  language: Language;
}

const foodItems = [Pizza, Salad, Utensils, ChefHat, UtensilsCrossed];

export function WaitingScreen({ onCancel, language }: WaitingScreenProps) {
  const { t } = useTranslation(language);
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 dark:from-slate-900 dark:via-orange-900/20 dark:to-slate-900 flex items-center justify-center z-50">
      {/* Decorative food items background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => {
          const FoodIcon = foodItems[i % foodItems.length];
          return (
            <div
              key={i}
              className="absolute opacity-10 dark:opacity-5"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              <FoodIcon className="w-12 h-12 text-amber-900 dark:text-amber-200" />
            </div>
          );
        })}
      </div>

      <div className="relative text-center space-y-8 px-4 max-w-md">
        {/* Chef Hat Loader */}
        <div className="flex justify-center">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-400 to-red-400 opacity-20 animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-r from-orange-400 to-red-400 opacity-30 animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="absolute inset-4 flex items-center justify-center bg-white dark:bg-slate-800 rounded-full shadow-lg">
              <div className="relative">
                <ChefHat className="w-12 h-12 text-amber-600 dark:text-amber-400 animate-bounce" style={{ animationDuration: '1.5s' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-orange-400 rounded-full animate-spin" style={{ animationDuration: '2s' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-orange-200 dark:border-orange-900/30 p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 dark:from-orange-400 dark:to-red-400 bg-clip-text text-transparent">
              {t('chat.partner.finding')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('profile.interests.desc')}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-2 pt-4">
            <div className="flex gap-1 justify-center h-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full bg-gradient-to-r from-orange-400 to-red-400 opacity-60"
                  style={{
                    animation: `pulse 1.5s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {t('profile.interests')}...
            </p>
          </div>
        </div>

        {/* Food items decoration */}
        <div className="flex justify-center gap-4 py-4">
          {foodItems.slice(0, 3).map((Icon, i) => (
            <div
              key={i}
              className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30"
              style={{
                animation: `float ${2 + i * 0.3}s ease-in-out infinite`,
              }}
            >
              <Icon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          ))}
        </div>

        {/* Cancel Button */}
        <Button
          variant="outline"
          onClick={onCancel}
          data-testid="button-cancel-matching"
          className="border-2 border-orange-300 dark:border-orange-900/50 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full px-8 font-semibold"
        >
          {t('hero.start') === 'Start Chatting' ? 'Cancel' : 'Ghairi'}
        </Button>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
