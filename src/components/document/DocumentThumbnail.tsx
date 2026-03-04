import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentThumbnailProps {
  fileUrl: string;
  title: string;
  thumbnailUrl?: string | null;
  className?: string;
}

const DocumentThumbnail = ({ fileUrl, title, thumbnailUrl, className = "" }: DocumentThumbnailProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // If we have a custom thumbnail, skip PDF loading
    if (thumbnailUrl) return;

    const fetchPdfUrl = async () => {
      try {
        const filePath = fileUrl.replace(/^pdfs\//, "");
        const { data, error } = await supabase.storage
          .from("pdfs")
          .createSignedUrl(filePath, 3600);

        if (error || !data?.signedUrl) {
          setHasError(true);
          return;
        }
        setPdfUrl(data.signedUrl);
      } catch {
        setHasError(true);
      }
    };

    if (fileUrl) {
      fetchPdfUrl();
    }
  }, [fileUrl, thumbnailUrl]);

  // Custom thumbnail: show full image without cropping
  if (thumbnailUrl) {
    return (
      <div className={`bg-muted rounded-lg overflow-hidden flex items-center justify-center ${className}`}>
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  if (hasError || !pdfUrl) {
    return (
      <div className={`bg-muted rounded-lg flex items-center justify-center ${className}`}>
        <FileText className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`bg-muted rounded-lg overflow-hidden flex items-center justify-center ${className}`}>
      <Document
        file={pdfUrl}
        loading={
          <div className="flex items-center justify-center w-full h-full">
            <FileText className="h-6 w-6 text-muted-foreground animate-pulse" />
          </div>
        }
        onLoadError={() => setHasError(true)}
        className="flex items-center justify-center [&_canvas]:!w-full [&_canvas]:!h-auto"
      >
        <Page
          pageNumber={1}
          width={80}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>
    </div>
  );
};

export default DocumentThumbnail;
