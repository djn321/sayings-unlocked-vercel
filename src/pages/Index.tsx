import { Hero } from "@/components/Hero";
import { EmailPreview } from "@/components/EmailPreview";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { FeedbackPagePreview } from "@/components/FeedbackPagePreview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EtymologyCard } from "@/components/EtymologyCard";

const Index = () => {
  const sampleSayings = [
    {
      saying: "Spill the beans",
      origin: "In ancient Greece, black and white beans were used for voting. Black beans meant 'no' and white beans meant 'yes.' If someone accidentally spilled the beans before voting was complete, they would reveal the outcome prematurely.",
      meaning: "To reveal a secret or disclose information that was meant to be kept private.",
      era: "Ancient Greece"
    },
    {
      saying: "Bite the bullet",
      origin: "Before anesthesia, patients undergoing surgery would bite on a bullet or leather strap to help them endure the pain. This practice was especially common during wartime when medical supplies were scarce.",
      meaning: "To endure a painful or difficult situation with courage and determination.",
      era: "19th Century"
    },
    {
      saying: "Cat's out of the bag",
      origin: "In medieval markets, unscrupulous merchants would sometimes sell customers a cat in a bag, claiming it was a pig. When the buyer opened the bag at home, the cat would escape, revealing the deception.",
      meaning: "A secret has been revealed, often accidentally or prematurely.",
      era: "Medieval Times"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <Hero />

      {/* Main Content */}
      <div className="container mx-auto px-6 py-16 space-y-20">
        {/* Email Preview Section */}
        <section>
          <EmailPreview />
        </section>

        {/* Feedback Page Preview Section */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif font-bold text-primary mb-4">
              Feedback Thank You Page
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              This is what subscribers see after clicking a feedback button in their email
            </p>
          </div>
          
          <Tabs defaultValue="like" className="max-w-3xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="like">Like Response</TabsTrigger>
              <TabsTrigger value="dislike">Dislike Response</TabsTrigger>
            </TabsList>
            <TabsContent value="like">
              <FeedbackPagePreview feedbackType="like" />
            </TabsContent>
            <TabsContent value="dislike">
              <FeedbackPagePreview feedbackType="dislike" />
            </TabsContent>
          </Tabs>
        </section>

        {/* Sample Sayings Section */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-4xl font-serif font-bold text-primary mb-4">
              Explore Etymology
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Here are some examples of the fascinating stories behind common phrases
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sampleSayings.map((saying, index) => (
              <EtymologyCard key={index} {...saying} />
            ))}
          </div>
        </section>

        {/* Subscription Section */}
        <section className="text-center">
          <div className="mb-12">
            <h2 className="text-4xl font-serif font-bold text-primary mb-4">
              Ready to Learn?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of word enthusiasts who start their day with fascinating etymology
            </p>
          </div>
          
          <SubscriptionForm />
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-secondary/30 py-8 mt-20">
        <div className="container mx-auto px-6 text-center">
          <p className="text-muted-foreground">
            Etymology Daily - Bringing the stories of language to life
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
