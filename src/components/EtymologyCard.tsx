import { Card } from "@/components/ui/card";

interface EtymologyCardProps {
  saying: string;
  origin: string;
  meaning: string;
  era?: string;
}

export const EtymologyCard = ({ saying, origin, meaning, era }: EtymologyCardProps) => {
  return (
    <Card className="p-6 transition-all duration-300 hover:shadow-[var(--shadow-elegant)] border-2 hover:border-accent/20">
      <div className="space-y-4">
        <div className="border-l-4 border-accent pl-4">
          <h3 className="text-xl font-serif font-bold text-primary leading-relaxed">
            "{saying}"
          </h3>
        </div>
        
        {era && (
          <div className="inline-block">
            <span className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-full font-medium">
              {era}
            </span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">
              Origin
            </h4>
            <p className="text-foreground leading-relaxed">
              {origin}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">
              Meaning
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              {meaning}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};