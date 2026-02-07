import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentThumbnailProps {
  fileUrl: string;
  title: string;
  className?: string;
}

const DocumentThumbnail = ({ fileUrl, title, className = "" }: DocumentThumbnailProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchPdfUrl = async () => {
      try {
        const { data } = supabase.storage.from("pdfs").getPublicUrl(fileUrl);
        if (data?.publicUrl) {
          setPdfUrl(data.publicUrl);
        }
      } catch (error) {
        console.error("Failed to get PDF URL:", error);
        setHasError(true);
      }
    };

    if (fileUrl) {
      fetchPdfUrl();
    }
  }, [fileUrl]);

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
        className="flex items-center justify-center"
      >
        <Page
          pageNumber={1}
          width={48}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>
    </div>
  );
};

export default DocumentThumbnail;
