import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function Confirm() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const confirmSubscription = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setMessage("Invalid confirmation link. No token found.");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("confirm-subscription", {
          body: { token },
        });

        if (error) {
          throw error;
        }

        if (data.error) {
          setStatus("error");
          setMessage(data.error);
        } else {
          setStatus("success");
          setMessage(`Successfully confirmed subscription for ${data.email}`);
        }
      } catch (error: unknown) {
        console.error("Confirmation error:", error);
        setStatus("error");
        setMessage("Failed to confirm subscription. The link may be invalid or expired.");
      }
    };

    confirmSubscription();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Confirming your subscription...</h1>
            <p className="text-muted-foreground">Please wait a moment</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-green-700">Subscription Confirmed!</h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <p className="mb-6">
              🎉 You're all set! You'll receive your first etymology email tomorrow morning.
            </p>
            <Link to="/">
              <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                Return to Home
              </Button>
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-destructive">Confirmation Failed</h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <Link to="/">
              <Button variant="outline">Return to Home</Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
