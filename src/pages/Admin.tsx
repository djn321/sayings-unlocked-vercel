import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function Admin() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading, signOut } = useAdminAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-accent/5 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-accent/5 py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          <Card className="p-6 text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
            <p className="text-muted-foreground mb-6">
              You don't have admin privileges to access this page.
            </p>
            <Button onClick={signOut} variant="outline">
              Sign Out
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const handleSendDailyEmail = async () => {
    setIsLoading(true);

    try {
      // Call the send-daily-etymology function
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
        description: `Daily etymology email sent to ${data.success} subscribers. Failed: ${data.failed}. Total: ${data.total}`,
      });
    } catch (error) {
      console.error("Failed to send daily email:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send daily etymology email",
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
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">Send Daily Email</h2>
              <p className="text-muted-foreground">
                Logged in as {user.email}
              </p>
            </div>
            <Button onClick={signOut} variant="outline" size="sm">
              Sign Out
            </Button>
          </div>
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
