import { Upload, Link2, QrCode, BarChart3, Shield, CreditCard, Globe, MessageSquare } from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "Easy Upload",
    description: "Drag and drop your PDFs. Add titles, descriptions, and choose visibility settings in seconds.",
  },
  {
    icon: Link2,
    title: "Short URLs",
    description: "Auto-generated short links for easy sharing. Custom aliases available for premium users.",
  },
  {
    icon: QrCode,
    title: "QR Codes",
    description: "Every document gets a scannable QR code. Perfect for restaurants, hotels, and events.",
  },
  {
    icon: BarChart3,
    title: "Rich Analytics",
    description: "Track views, downloads, QR scans, and referrer sources. Know your audience.",
  },
  {
    icon: Shield,
    title: "Access Control",
    description: "Make documents private, unlisted, or public. Enable or disable downloads and comments.",
  },
  {
    icon: CreditCard,
    title: "Accept Donations",
    description: "Let viewers support your content with M-Pesa, PayPal, or Stripe donations.",
  },
  {
    icon: Globe,
    title: "Explore Directory",
    description: "List your documents publicly. Great for hotel menus, brochures, and guides.",
  },
  {
    icon: MessageSquare,
    title: "Comments & Feedback",
    description: "Engage with your audience through threaded comments and reactions.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to share PDFs
          </h2>
          <p className="text-lg text-muted-foreground">
            From upload to analytics, we've got you covered with powerful features designed for modern document sharing.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <feature.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
