import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function UnsubscribeSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2 text-green-700">Successfully Unsubscribed</h1>
        <p className="text-muted-foreground mb-6">
          You've been unsubscribed from the daily etymology emails.
        </p>
        <p className="mb-6">
          We're sorry to see you go! If you change your mind, you can always subscribe again from the home page.
        </p>
        <Link to="/">
          <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
            Return to Home
          </Button>
        </Link>
      </Card>
    </div>
  );
}
