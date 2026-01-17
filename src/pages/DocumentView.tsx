import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Download,
  Share2,
  QrCode,
  Eye,
  Heart,
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  DollarSign,
} from "lucide-react";
import BookViewer from "@/components/document/BookViewer";

const DocumentView = () => {
  const { id } = useParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const totalPages = 12;

  const document = {
    id,
    title: "Grand Hotel Menu 2024",
    description: "Our complete menu featuring breakfast, lunch, dinner, and specialty items from our award-winning chefs.",
    author: "Grand Hotel",
    views: 12453,
    downloads: 3291,
    uploadedAt: "2024-01-15",
    shortUrl: "pdf.ly/grand-menu",
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${document.shortUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <FileText className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold hidden sm:inline">PDFShare</span>
              </Link>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <h1 className="text-sm font-medium truncate max-w-[200px] sm:max-w-none">
                {document.title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-2">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <Button variant="hero" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* PDF Viewer */}
          {/* Book Viewer */}
          <div className="lg:col-span-2">
            <BookViewer 
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Document Info */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-2">{document.title}</h2>
              <p className="text-muted-foreground mb-4">{document.description}</p>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">GH</span>
                </div>
                <div>
                  <p className="font-medium">{document.author}</p>
                  <p className="text-sm text-muted-foreground">Uploaded Jan 15, 2024</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-muted/50 rounded-xl p-3">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Eye className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-bold">{document.views.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Views</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Download className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-bold">{document.downloads.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Downloads</p>
                </div>
              </div>
            </div>

            {/* Short URL & QR */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Share this document</h3>
              
              {/* Short URL */}
              <div className="mb-4">
                <label className="text-sm text-muted-foreground mb-2 block">Short URL</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-mono truncate">
                    {document.shortUrl}
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* QR Code */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">QR Code</label>
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="w-full flex items-center justify-center gap-2 bg-muted rounded-lg p-4 hover:bg-muted/80 transition-colors"
                >
                  <QrCode className="h-5 w-5" />
                  <span className="text-sm font-medium">{showQR ? "Hide" : "Show"} QR Code</span>
                </button>
                {showQR && (
                  <div className="mt-4 p-4 bg-white rounded-xl flex items-center justify-center">
                    <div className="w-40 h-40 bg-muted rounded grid grid-cols-8 gap-0.5 p-2">
                      {Array.from({ length: 64 }).map((_, i) => (
                        <div key={i} className={`rounded-sm ${Math.random() > 0.5 ? 'bg-foreground' : 'bg-transparent'}`} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Donate */}
            <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl border border-accent/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold">Support the creator</h3>
                  <p className="text-sm text-muted-foreground">Show appreciation with a donation</p>
                </div>
              </div>
              <Button variant="hero" className="w-full gap-2">
                <DollarSign className="h-4 w-4" />
                Donate
              </Button>
            </div>

            {/* Comments Preview */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments (24)
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Join the conversation about this document.
              </p>
              <Button variant="outline" className="w-full">
                View Comments
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentView;
