import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { 
  FileText, 
  QrCode, 
  BarChart3, 
  Globe, 
  Shield, 
  Zap,
  Users,
  Target,
  Heart
} from "lucide-react";

const About = () => {
  const values = [
    {
      icon: Zap,
      title: "Simplicity First",
      description: "We believe sharing documents should be as easy as sharing a link. No complicated setups, no learning curves.",
    },
    {
      icon: Shield,
      title: "Privacy & Control",
      description: "Your documents, your rules. Control who can view, download, and interact with your content.",
    },
    {
      icon: Globe,
      title: "Accessibility",
      description: "Making documents accessible to everyone, everywhere, on any device with a simple scan or click.",
    },
  ];

  const stats = [
    { value: "10K+", label: "Documents Shared" },
    { value: "50K+", label: "QR Codes Generated" },
    { value: "100+", label: "Countries Reached" },
    { value: "99.9%", label: "Uptime" },
  ];

  const team = [
    {
      role: "Our Mission",
      icon: Target,
      description: "To revolutionize how businesses and individuals share documents by providing a seamless, modern platform that bridges the gap between physical and digital experiences.",
    },
    {
      role: "Our Vision",
      icon: Users,
      description: "A world where every menu, brochure, and document is just a scan away—reducing paper waste while improving accessibility and engagement.",
    },
    {
      role: "Our Promise",
      icon: Heart,
      description: "We're committed to building tools that empower creators and businesses to share their content beautifully, track engagement meaningfully, and grow sustainably.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <FileText className="h-4 w-4" />
            About PDFShare
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Reimagining Document{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Sharing
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            We started with a simple question: Why is sharing a PDF still so complicated? 
            Our answer became PDFShare—a modern platform that makes document sharing beautiful, 
            trackable, and accessible.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  PDFShare was born from a frustration we've all experienced—trying to share 
                  a document and watching recipients struggle with downloads, broken links, 
                  or outdated versions.
                </p>
                <p>
                  We envisioned a world where restaurants could update their menus instantly, 
                  hotels could share brochures with a QR code, and businesses could track 
                  how their documents perform—all without technical expertise.
                </p>
                <p>
                  Today, PDFShare serves thousands of users across the globe, from small 
                  cafés in Nairobi to hotels in Dubai, all sharing documents the modern way.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">QR Codes</h3>
                <p className="text-sm text-muted-foreground">Instant access via scan</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold mb-1">Analytics</h3>
                <p className="text-sm text-muted-foreground">Track engagement</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="font-semibold mb-1">Global</h3>
                <p className="text-sm text-muted-foreground">Share anywhere</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-orange-500" />
                </div>
                <h3 className="font-semibold mb-1">Fast</h3>
                <p className="text-sm text-muted-foreground">Instant updates</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission/Vision Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What Drives Us</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our core beliefs shape everything we build
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {team.map((item) => (
              <div
                key={item.role}
                className="bg-card rounded-2xl border border-border p-8 text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.role}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The principles that guide our product decisions
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value) => (
              <div
                key={value.title}
                className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/50 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <value.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of users who are already sharing documents the modern way.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link to="/signup">Create Free Account</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/explore">Explore Documents</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
