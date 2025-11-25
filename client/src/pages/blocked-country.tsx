import { useTranslation } from "@/lib/i18n";
import { useLanguage } from "@/hooks/use-language";

export default function BlockedCountry() {
  const { language } = useLanguage();
  const { t } = useTranslation(language);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center max-w-md px-4">
        <div className="mb-6">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            Service Unavailable
          </h1>
          <p className="text-lg text-muted-foreground">
            This service is not available in your country.
          </p>
        </div>
      </div>
    </div>
  );
}
