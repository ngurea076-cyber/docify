import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Upload, Link2, QrCode, BarChart3 } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-accent/5 to-transparent rounded-full" />
      </div>

      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-8 animate-fade-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            Now with QR codes & analytics
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Share PDFs with
            <span className="block gradient-text">style & insights</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            Upload documents, generate short links & QR codes, track engagement, and even accept donations. The modern way to share PDFs.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <Button variant="hero" size="xl" asChild>
              <Link to="/signup">
                Start Sharing Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="xl" asChild>
              <Link to="/explore">
                Explore Documents
              </Link>
            </Button>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: '0.4s' }}>
            {[
              { icon: Upload, label: "Easy Upload" },
              { icon: Link2, label: "Short URLs" },
              { icon: QrCode, label: "QR Codes" },
              { icon: BarChart3, label: "Analytics" },
            ].map((feature, index) => (
              <div
                key={feature.label}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm"
              >
                <feature.icon className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-foreground">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero Image/Preview */}
        <div className="mt-20 max-w-5xl mx-auto animate-fade-up" style={{ animationDelay: '0.5s' }}>
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-accent/20 via-primary/10 to-accent/20 rounded-3xl blur-2xl opacity-60" />
            
            {/* Preview Card */}
            <div className="relative bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
              {/* Browser Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                  <div className="w-3 h-3 rounded-full bg-green-400/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-background/80 text-xs text-muted-foreground">
                    pdfshare.app/d/hotel-menu
                  </div>
                </div>
              </div>
              
              {/* Dashboard Preview */}
              <div className="p-6 md:p-8 bg-gradient-to-b from-muted/30 to-background">
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Stats Cards */}
                  <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                    <div className="text-sm text-muted-foreground mb-1">Total Views</div>
                    <div className="text-3xl font-bold text-foreground">12,847</div>
                    <div className="text-xs text-accent mt-2">↑ 23% from last week</div>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                    <div className="text-sm text-muted-foreground mb-1">Downloads</div>
                    <div className="text-3xl font-bold text-foreground">3,291</div>
                    <div className="text-xs text-accent mt-2">↑ 12% from last week</div>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                    <div className="text-sm text-muted-foreground mb-1">QR Scans</div>
                    <div className="text-3xl font-bold text-foreground">856</div>
                    <div className="text-xs text-accent mt-2">↑ 45% from last week</div>
                  </div>
                </div>
                
                {/* Document Preview */}
                <div className="mt-6 flex gap-6">
                  <div className="flex-1 bg-card rounded-xl border border-border p-4 shadow-sm">
                    <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center p-4">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
                          <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="text-sm font-medium text-foreground">Hotel Menu 2024</div>
                        <div className="text-xs text-muted-foreground mt-1">12 pages • PDF</div>
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:block w-48 space-y-4">
                    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
                      <div className="text-xs text-muted-foreground mb-2">Short URL</div>
                      <div className="text-sm font-mono text-accent truncate">pdf.ly/hotel-menu</div>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
                      <div className="text-xs text-muted-foreground mb-2">QR Code</div>
                      <div className="aspect-square bg-muted rounded-lg grid grid-cols-5 gap-0.5 p-2">
                        {Array.from({ length: 25 }).map((_, i) => (
                          <div key={i} className={`rounded-sm ${Math.random() > 0.5 ? 'bg-foreground' : 'bg-transparent'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
