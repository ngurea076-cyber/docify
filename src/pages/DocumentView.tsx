import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Download,
  Share2,
  Heart,
  AlertCircle,
  DollarSign,
  ShoppingCart,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import BookViewer from "@/components/document/BookViewer";
import CommentsSection from "@/components/document/CommentsSection";
import DocumentOwnerSection from "@/components/document/DocumentOwnerSection";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Document = Tables<"documents">;

interface DocumentWithProfile extends Document {
  profiles?: {
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    mpesa_paybill: string | null;
    mpesa_till: string | null;
  } | null;
}

const DocumentView = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [donateModalOpen, setDonateModalOpen] = useState(false);
  const [copiedPayment, setCopiedPayment] = useState<string | null>(null);
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
        // Try lookup by slug first, then by UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const column = isUuid ? "id" : "slug";

        // Fetch document with author profile
        const { data: docData, error: docError } = await supabase
          .from("documents")
          .select(`
            *,
            profiles:user_id (
              username,
              avatar_url,
              bio,
              mpesa_paybill,
              mpesa_till
            )
          `)
          .eq(column, id)
          .maybeSingle();

        if (docError) throw docError;

        if (!docData) {
          setError("Document not found");
          setLoading(false);
          return;
        }

        setDocument(docData);

        // Increment view count and log the view
        await Promise.all([
          supabase
            .from("documents")
            .update({ view_count: (docData.view_count || 0) + 1 })
            .eq("id", docData.id),
          supabase
            .from("document_views")
            .insert({ document_id: docData.id }),
        ]);

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
    const slug = (document as any)?.slug || id;
    const shortUrl = `${window.location.origin}/d/${slug}`;
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
        .eq("id", document.id);

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

  const handleCopyPayment = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    setCopiedPayment(label);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
    setTimeout(() => setCopiedPayment(null), 2000);
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

      <div className="w-[90vw] mx-auto py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Book Viewer - Left side */}
          <div className="lg:col-span-2">
            <BookViewer 
              fileUrl={pdfUrl || undefined}
              onPageChange={setCurrentPage}
            />
          </div>

          {/* Right sidebar: Owner + Order/Donate + Comments */}
          <div className="space-y-4">
            <DocumentOwnerSection
              documentId={document.id}
              owner={document.profiles}
              documentType={document.document_type}
              description={document.description}
              country={document.country}
              city={document.city}
              area={document.area}
              googleMapsUrl={document.google_maps_url}
            />

            {/* Order CTA for menus with order_url */}
            {document.document_type === "menu" && document.order_url && (
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <ShoppingCart className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Ready to order?</h3>
                    <p className="text-sm text-muted-foreground">Place your order via WhatsApp or website</p>
                  </div>
                  <Button 
                    variant="hero" 
                    className="gap-2 shrink-0"
                    onClick={() => window.open(document.order_url!, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Order Now
                  </Button>
                </div>
              </div>
            )}

            {/* Donation CTA */}
            {document.allow_donations && !(document.document_type === "menu" && document.order_url) && (
              <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl border border-accent/20 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                    <Heart className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Support the creator</h3>
                    <p className="text-sm text-muted-foreground">Show appreciation with a donation</p>
                  </div>
                  <Button variant="hero" className="gap-2 shrink-0">
                    <DollarSign className="h-4 w-4" />
                    Donate
                  </Button>
                </div>
              </div>
            )}

            {/* Comments Section */}
            {document.allow_comments && (
              <CommentsSection 
                documentId={document.id} 
                allowComments={document.allow_comments}
                embedded={true}
                pageSize={5}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentView;
