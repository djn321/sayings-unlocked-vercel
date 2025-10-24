import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }).max(255),
});

export const SubscriptionForm = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate email
      const validation = emailSchema.safeParse({ email: email.trim() });
      if (!validation.success) {
        toast({
          title: "Invalid email",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Save to database
      const { data: newSubscriber, error } = await supabase
        .from("subscribers")
        .insert({ email: validation.data.email })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already subscribed",
            description: "This email is already on our list!",
          });
        } else {
          throw error;
        }
      } else {
        // Send confirmation email
        const { error: emailError } = await supabase.functions.invoke(
          "send-confirmation-email",
          {
            body: {
              email: validation.data.email,
              token: newSubscriber.confirmation_token,
            },
          }
        );

        if (emailError) {
          console.error("Failed to send confirmation email:", emailError);
          toast({
            title: "Subscription saved",
            description: "However, we couldn't send the confirmation email. Please contact support.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Check your email!",
            description: "We've sent you a confirmation link. Please check your inbox to complete your subscription.",
          });
        }
        setEmail("");
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-8 max-w-md mx-auto bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-accent/20">
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-primary mb-2">
            Start Your Daily Journey
          </h3>
          <p className="text-muted-foreground">
            Get a fascinating etymology delivered to your inbox every morning
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 text-center border-2 border-accent/30 focus:border-accent transition-colors"
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold text-lg shadow-[var(--shadow-gold)] transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
          >
            {isLoading ? "Subscribing..." : "Subscribe to Etymology Daily"}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            📧 One email per day • 📚 Rich historical content • 🚫 No spam, ever
          </p>
        </div>
      </div>
    </Card>
  );
};