import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { InterestsSelector } from "@/components/InterestsSelector";
import { Video, MessageCircle, Users, AlertTriangle, Lock, Globe } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { OnlineStats } from "@shared/schema";
import { useLanguage, type Language } from "@/hooks/use-language";
import { LANGUAGES, useTranslation } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [isStarting, setIsStarting] = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState<{ enabled: boolean; reason: string } | null>(null);
  const [banStatus, setBanStatus] = useState<{ isBanned: boolean; reason?: string; timeRemaining?: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const { language, changeLanguage, isLoading: langLoading } = useLanguage();
  const { t } = useTranslation(language);

  const { data: stats } = useQuery<OnlineStats>({
    queryKey: ['/api/stats'],
    refetchInterval: 10000,
  });

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const response = await fetch('/api/maintenance');
        const data = await response.json();
        setMaintenanceMode(data);
      } catch (error) {
        console.error('Failed to check maintenance status');
      }
    };
    
    checkMaintenance();
    const interval = setInterval(checkMaintenance, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!banStatus?.isBanned || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setBanStatus(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [banStatus, timeLeft]);

  const handleStartChat = async () => {
    try {
      const response = await fetch('/api/check-ban-status');
      const data = await response.json();
      if (data.isBanned) {
        setBanStatus(data);
        setTimeLeft(Math.ceil(data.timeRemaining / 1000));
      } else {
        setShowInterests(true);
      }
    } catch (error) {
      console.error('Failed to check ban status:', error);
      setShowInterests(true);
    }
  };

  const handleInterestsSelected = (data: { nickname: string; gender: string; age: number; interests: string[] }) => {
    setIsStarting(true);
    sessionStorage.setItem('userProfile', JSON.stringify(data));
    setTimeout(() => {
      setLocation('/chat');
    }, 100);
  };

  if (banStatus?.isBanned) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-destructive/5 via-background to-destructive/5 px-4">
        <div className="max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{t('banned.title')}</h1>
            <p className="text-muted-foreground">
              {t('banned.desc')}
            </p>
          </div>
          <div className="p-4 bg-secondary rounded-lg space-y-3">
            <div>
              <p className="text-sm font-medium">{t('banned.reason')}</p>
              <p className="text-sm text-muted-foreground mt-1">{banStatus.reason}</p>
            </div>
            <div>
              <p className="text-sm font-medium">{t('banned.time')}</p>
              <p className="text-lg font-bold text-destructive mt-1">
                {Math.floor(timeLeft / 86400)}d {Math.floor((timeLeft % 86400) / 3600)}h {Math.floor((timeLeft % 3600) / 60)}m {timeLeft % 60}s
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('banned.msg')}
          </p>
        </div>
      </div>
    );
  }

  if (maintenanceMode?.enabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-destructive/5 via-background to-destructive/5 px-4">
        <div className="max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{t('maintenance.title')}</h1>
            <p className="text-muted-foreground">
              {t('maintenance.desc')}
            </p>
          </div>
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-sm font-medium">{t('maintenance.reason')}</p>
            <p className="text-sm text-muted-foreground mt-1">{maintenanceMode.reason}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('maintenance.check')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm bg-background/80 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-6 h-6 text-primary" />
            <span className="font-bold text-xl">{t('app.title')}</span>
          </div>
          <div className="flex items-center gap-3">
            {stats && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-online-count">
                <div className="w-2 h-2 rounded-full bg-status-online animate-pulse" />
                <span className="font-medium">{stats.totalOnline.toLocaleString()}</span>
                <span className="hidden sm:inline">{t('online')}</span>
              </div>
            )}
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value as Language)}
              className="flex items-center gap-1 px-2 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-md hover-elevate transition-all border border-input"
              data-testid="select-language"
            >
              {Object.entries(LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4 pt-16">
        <div className="max-w-4xl mx-auto text-center space-y-8 py-12">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
              {t('app.tagline')}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('hero.description')}
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto pt-8">
            <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-card-border hover-elevate">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">{t('hero.features.video')}</h3>
              <p className="text-sm text-muted-foreground">{t('hero.features.video.desc')}</p>
            </div>
            <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-card-border hover-elevate">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">{t('hero.features.messaging')}</h3>
              <p className="text-sm text-muted-foreground">{t('hero.features.messaging.desc')}</p>
            </div>
            <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-card-border hover-elevate">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">{t('hero.features.matching')}</h3>
              <p className="text-sm text-muted-foreground">{t('hero.features.matching.desc')}</p>
            </div>
          </div>

          {/* CTA or Interests Selector */}
          <div className="pt-8 max-w-2xl mx-auto">
            {!showInterests ? (
              <>
                <Button
                  size="lg"
                  className="text-lg px-12 py-6 h-auto rounded-lg"
                  onClick={handleStartChat}
                  disabled={isStarting}
                  data-testid="button-start-chat"
                >
                  {isStarting ? t('profile.loading') : t('hero.start')}
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  {t('hero.disclaimer')}
                </p>
              </>
            ) : (
              <InterestsSelector
                onSelect={handleInterestsSelected}
                isLoading={isStarting}
                language={language}
              />
            )}
          </div>

          {/* Trust Indicator */}
          {stats && stats.totalOnline > 0 && (
            <div className="pt-8 text-sm text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">{stats.inChat}</span> {t('hero.people')}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        <p>{t('hero.footer')}</p>
      </footer>
    </div>
  );
}
