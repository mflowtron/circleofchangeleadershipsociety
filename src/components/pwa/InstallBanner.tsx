import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import logoEmblem from '@/assets/coclc-logo-emblem.png';

export default function InstallBanner() {
  const { canInstall, isIOS, promptInstall, dismiss } = usePWAInstall();

  if (!canInstall) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-fade-up">
      <div className="max-w-lg mx-auto bg-card border border-border rounded-2xl shadow-medium p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <img 
              src={logoEmblem} 
              alt="App icon" 
              className="w-8 h-8 rounded-lg"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm">
              Install Circle of Change
            </h3>
            {isIOS ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                Tap <Share className="inline h-3 w-3 mx-0.5" /> then "Add to Home Screen"
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                Add to your home screen for the best experience
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 text-muted-foreground"
            onClick={dismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!isIOS && (
          <Button 
            onClick={promptInstall}
            className="w-full mt-3 btn-gold-glow rounded-xl"
          >
            <Download className="h-4 w-4 mr-2" />
            Install App
          </Button>
        )}
      </div>
    </div>
  );
}
