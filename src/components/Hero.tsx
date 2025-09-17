import heroImage from "@/assets/hero-etymology.jpg";

export const Hero = () => {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-accent/40"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <div className="space-y-6">
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-primary-foreground leading-tight">
            Etymology
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-accent to-yellow-300">
              Daily
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-primary-foreground/90 max-w-2xl mx-auto leading-relaxed">
            Discover the fascinating origins of common sayings and phrases. 
            Get a daily dose of linguistic history delivered to your inbox.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <div className="flex items-center gap-2 text-primary-foreground/80">
              <span className="text-2xl">📚</span>
              <span className="font-medium">Rich Historical Context</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-accent rounded-full"></div>
            <div className="flex items-center gap-2 text-primary-foreground/80">
              <span className="text-2xl">📧</span>
              <span className="font-medium">Daily Email Delivery</span>
            </div>
            <div className="hidden sm:block w-1 h-1 bg-accent rounded-full"></div>
            <div className="flex items-center gap-2 text-primary-foreground/80">
              <span className="text-2xl">🎓</span>
              <span className="font-medium">Educational & Fun</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent"></div>
    </section>
  );
};