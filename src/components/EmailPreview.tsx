import { Card } from "@/components/ui/card";
import { EtymologyCard } from "./EtymologyCard";

export const EmailPreview = () => {
  const sampleSaying = {
    saying: "Break the ice",
    origin: "This phrase comes from the literal practice of breaking ice to allow ships to pass through frozen waters. The metaphorical use, meaning to initiate conversation or ease tension in social situations, was first recorded in literature by Sir Thomas North in 1579.",
    meaning: "To initiate conversation in a social setting, or to get something started by overcoming initial awkwardness or tension.",
    era: "16th Century"
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-bold text-primary mb-2">Daily Email Preview</h3>
        <p className="text-muted-foreground">See what you'll receive in your inbox each morning</p>
      </div>
      
      <Card className="p-8 bg-gradient-to-br from-background to-secondary/30 border-2 border-accent/20">
        <div className="space-y-6">
          {/* Email Header */}
          <div className="text-center pb-6 border-b border-border">
            <h1 className="text-3xl font-serif font-bold text-gradient mb-2">
              Etymology Daily
            </h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          {/* Today's Saying */}
          <div>
            <h2 className="text-xl font-semibold text-primary mb-4 text-center">
              📚 Today's Saying
            </h2>
            <EtymologyCard {...sampleSaying} />
          </div>

          {/* Email Footer */}
          <div className="pt-6 border-t border-border text-center text-sm text-muted-foreground">
            <p>Sent with ❤️ from Etymology Daily</p>
            <p className="mt-1">Unsubscribe | Manage Preferences</p>
          </div>
        </div>
      </Card>
    </div>
  );
};