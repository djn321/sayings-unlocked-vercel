import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";

const Feedback = () => {
  const [searchParams] = useSearchParams();
  const feedbackType = searchParams.get("type") || "like";
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center p-5">
      <Card className="bg-white rounded-xl p-12 text-center shadow-lg max-w-md w-full">
        <div className="text-6xl mb-6">
          {feedbackType === 'like' ? '👍' : '👎'}
        </div>
        <h1 className="text-amber-600 text-3xl font-bold mb-4">
          Thank you for your feedback!
        </h1>
        <p className="text-stone-700 text-lg leading-relaxed">
          Your feedback helps us improve the etymologies we send you.
        </p>
      </Card>
    </div>
  );
};

export default Feedback;
