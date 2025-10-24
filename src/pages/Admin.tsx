import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Admin() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendDailyEmail = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "send-daily-etymology",
        {
          body: {},
        }
      );

      if (error) {
        throw error;
      }

      toast({
        title: "Success!",
        description: `Daily etymology email sent to ${data.success} subscribers. Failed: ${data.failed}`,
      });
    } catch (error) {
      console.error("Failed to send daily email:", error);
      toast({
        title: "Error",
        description: "Failed to send daily etymology email. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/5 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">Manage Etymology Daily</p>
        </div>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Send Daily Email</h2>
          <p className="text-muted-foreground mb-6">
            Manually trigger the daily etymology email to all active subscribers.
          </p>
          <Button
            onClick={handleSendDailyEmail}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          >
            {isLoading ? "Sending..." : "Send Daily Etymology Email"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
