import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertCircle,
} from "lucide-react";
import BookViewer from "@/components/document/BookViewer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Document = Tables<"documents">;

interface DocumentWithProfile extends Document {
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const DocumentView = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [document, setDocument] = useState<DocumentWithProfile | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!id) {
        setError("Document ID not found");
        setLoading(false);
        return;
      }

      try {
        // Fetch document with author profile
        const { data: docData, error: docError } = await supabase
          .from("documents")
          .select(`
            *,
            profiles:user_id (
              username,
              avatar_url
            )
          `)
          .eq("id", id)
          .maybeSingle();

        if (docError) throw docError;

        if (!docData) {
          setError("Document not found");
          setLoading(false);
          return;
        }

        setDocument(docData);

        // Increment view count
        await supabase
          .from("documents")
          .update({ view_count: (docData.view_count || 0) + 1 })
          .eq("id", id);

        // Get signed URL for the PDF file
        if (docData.file_url) {
          // Extract the file path from the URL (remove bucket prefix if present)
          const filePath = docData.file_url.replace(/^pdfs\//, "");
          
          const { data: signedUrlData, error: signedUrlError } = await supabase
            .storage
            .from("pdfs")
            .createSignedUrl(filePath, 3600); // 1 hour expiry

          if (signedUrlError) {
            console.error("Error getting signed URL:", signedUrlError);
            // Try direct URL if signed URL fails
            const { data: { publicUrl } } = supabase
              .storage
              .from("pdfs")
              .getPublicUrl(filePath);
            setPdfUrl(publicUrl);
          } else {
            setPdfUrl(signedUrlData.signedUrl);
          }
        }
      } catch (err) {
        console.error("Error fetching document:", err);
        setError("Failed to load document");
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id]);

  const handleCopy = () => {
    const shortUrl = `${window.location.origin}/d/${id}`;
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Document link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!pdfUrl || !document?.allow_downloads) return;

    try {
      // Increment download count
      await supabase
        .from("documents")
        .update({ download_count: (document.download_count || 0) + 1 })
        .eq("id", id);

      // Open PDF in new tab for download
      window.open(pdfUrl, "_blank");
    } catch (err) {
      console.error("Error downloading:", err);
      toast({
        title: "Download failed",
        description: "Could not download the document",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getAuthorInitials = () => {
    if (document?.profiles?.username) {
      return document.profiles.username.slice(0, 2).toUpperCase();
    }
    return "AN";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <header className="sticky top-0 z-50 bg-card border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Skeleton className="h-[600px] w-full rounded-2xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Document Not Found</h2>
          <p className="text-muted-foreground mb-6">{error || "The document you're looking for doesn't exist."}</p>
          <Link to="/">
            <Button variant="hero">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

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
              <Button variant="ghost" size="sm" className="gap-2" onClick={handleCopy}>
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              {document.allow_downloads && (
                <Button variant="hero" size="sm" className="gap-2" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Book Viewer */}
          <div className="lg:col-span-2">
            <BookViewer 
              fileUrl={pdfUrl || undefined}
              onPageChange={setCurrentPage}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Document Info */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-2">{document.title}</h2>
              {document.description && (
                <p className="text-muted-foreground mb-4">{document.description}</p>
              )}
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {document.profiles?.avatar_url ? (
                    <img 
                      src={document.profiles.avatar_url} 
                      alt="Author" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-primary">
                      {getAuthorInitials()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium">{document.profiles?.username || "Anonymous"}</p>
                  <p className="text-sm text-muted-foreground">
                    Uploaded {formatDate(document.created_at)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-muted/50 rounded-xl p-3">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Eye className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-bold">{document.view_count.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Views</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Download className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-bold">{document.download_count.toLocaleString()}</p>
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
                    {`${window.location.host}/d/${id?.slice(0, 8)}`}
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`${window.location.origin}/d/${id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
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
            {document.allow_donations && (
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
            )}

            {/* Comments Preview */}
            {document.allow_comments && (
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Comments
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Join the conversation about this document.
                </p>
                <Button variant="outline" className="w-full">
                  View Comments
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentView;
