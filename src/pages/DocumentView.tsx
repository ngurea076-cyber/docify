import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Download,
  Share2,
  Heart,
  AlertCircle,
  DollarSign,
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

      <div className="w-[90vw] mx-auto py-4">
        {/* Book Viewer - Full width focus */}
        <div style={{ minHeight: "calc(100vh - 180px)" }}>
          <BookViewer 
            fileUrl={pdfUrl || undefined}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* Owner Section */}
        <div className="mt-6 space-y-4">
          <DocumentOwnerSection
            owner={document.profiles}
            documentType={document.document_type}
            country={document.country}
            city={document.city}
            area={document.area}
            googleMapsUrl={document.google_maps_url}
            rating={4.2}
            reviewCount={42}
          />

          {/* Donation CTA */}
          {document.allow_donations && (
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

          {/* Comments Section - Embedded with pagination */}
          {document.allow_comments && (
            <CommentsSection 
              documentId={id || ""} 
              allowComments={document.allow_comments}
              embedded={true}
              pageSize={5}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentView;
