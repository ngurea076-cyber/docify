import React, { useRef, useCallback, useState, useEffect, forwardRef } from "react";
import HTMLFlipBook from "react-pageflip";
import { Document, Page as PDFPage, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface BookViewerProps {
  fileUrl?: string;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

interface PageProps {
  pageNumber: number;
  width: number;
  height: number;
  fileUrl?: string;
}

// Forward ref page component for react-pageflip
const BookPage = forwardRef<HTMLDivElement, PageProps>(
  ({ pageNumber, width, height, fileUrl }, ref) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    return (
      <div
        ref={ref}
        className="book-page bg-white shadow-lg flex items-center justify-center overflow-hidden"
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        {fileUrl ? (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {error ? (
              <div className="text-center p-4">
                <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Page {pageNumber}</p>
              </div>
            ) : (
              <PDFPage
                pageNumber={pageNumber}
                width={width - 20}
                onLoadSuccess={() => setIsLoading(false)}
                onLoadError={() => {
                  setIsLoading(false);
                  setError(true);
                }}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="pdf-page"
              />
            )}
          </>
        ) : (
          <div className="text-center p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Page {pageNumber}</h3>
            <p className="text-sm text-muted-foreground">PDF Preview</p>
          </div>
        )}
      </div>
    );
  }
);

BookPage.displayName = "BookPage";

const BookViewer: React.FC<BookViewerProps> = ({ 
  fileUrl, 
  totalPages: initialTotalPages = 12,
  onPageChange 
}) => {
  const flipBookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [numPages, setNumPages] = useState<number>(initialTotalPages);
  const [dimensions, setDimensions] = useState({ width: 300, height: 400 });
  const [zoom, setZoom] = useState(100);
  const [pdfLoaded, setPdfLoaded] = useState(false);

  // Calculate dimensions based on container size
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;
        
        // Calculate page size (book shows 2 pages, so each page is half width)
        const maxPageWidth = (containerWidth - 60) / 2;
        const maxPageHeight = containerHeight - 40;
        
        // Maintain A4 aspect ratio (1:1.414)
        const aspectRatio = 1.414;
        let width = maxPageWidth;
        let height = width * aspectRatio;
        
        if (height > maxPageHeight) {
          height = maxPageHeight;
          width = height / aspectRatio;
        }

        // Apply zoom
        const scaledWidth = (width * zoom) / 100;
        const scaledHeight = (height * zoom) / 100;

        setDimensions({ width: Math.floor(scaledWidth), height: Math.floor(scaledHeight) });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [zoom]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfLoaded(true);
  };

  const handleFlip = useCallback((e: any) => {
    const page = e.data;
    setCurrentPage(page);
    onPageChange?.(page + 1);
  }, [onPageChange]);

  const goToPrevPage = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipPrev();
    }
  };

  const goToNextPage = () => {
    if (flipBookRef.current) {
      flipBookRef.current.pageFlip().flipNext();
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 20, 150));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 20, 60));
  };

  // Generate pages for the book
  const pages = Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevPage}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[100px] text-center">
            Page {currentPage + 1} - {Math.min(currentPage + 2, numPages)} of {numPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextPage}
            disabled={currentPage >= numPages - 2}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={zoom <= 60}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-12 text-center">{zoom}%</span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={zoom >= 150}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Book View Area */}
      <div 
        ref={containerRef}
        className="relative bg-gradient-to-b from-muted/50 to-muted flex items-center justify-center p-6"
        style={{ minHeight: "500px", height: "calc(100vh - 300px)", maxHeight: "700px" }}
      >
        {/* Book shadow/binding effect */}
        <div className="absolute inset-y-0 left-1/2 w-4 -translate-x-1/2 bg-gradient-to-r from-black/10 via-black/20 to-black/10 z-10 pointer-events-none" />
        
        {fileUrl && (
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            }
          >
            {/* Hidden, just for loading */}
          </Document>
        )}

        {(pdfLoaded || !fileUrl) && dimensions.width > 0 && (
          <HTMLFlipBook
            ref={flipBookRef}
            width={dimensions.width}
            height={dimensions.height}
            size="stretch"
            minWidth={200}
            maxWidth={500}
            minHeight={280}
            maxHeight={700}
            showCover={true}
            mobileScrollSupport={true}
            onFlip={handleFlip}
            className="book-flipbook"
            style={{}}
            startPage={0}
            drawShadow={true}
            flippingTime={600}
            usePortrait={false}
            startZIndex={0}
            autoSize={false}
            maxShadowOpacity={0.5}
            showPageCorners={true}
            disableFlipByClick={false}
            swipeDistance={30}
            clickEventForward={true}
            useMouseEvents={true}
          >
            {pages.map((pageNum) => (
              <BookPage
                key={pageNum}
                pageNumber={pageNum}
                width={dimensions.width}
                height={dimensions.height}
                fileUrl={fileUrl}
              />
            ))}
          </HTMLFlipBook>
        )}

        {!pdfLoaded && !fileUrl && (
          <div className="text-center text-muted-foreground">
            <p>Click and drag pages to flip, or use the navigation buttons</p>
          </div>
        )}
      </div>

      {/* Page thumbnails indicator */}
      <div className="flex items-center justify-center gap-1 p-3 border-t border-border bg-muted/30">
        {pages.slice(0, 10).map((pageNum) => (
          <div
            key={pageNum}
            className={`w-2 h-2 rounded-full transition-colors ${
              pageNum >= currentPage + 1 && pageNum <= currentPage + 2
                ? "bg-primary"
                : "bg-muted-foreground/30"
            }`}
          />
        ))}
        {numPages > 10 && (
          <span className="text-xs text-muted-foreground ml-2">+{numPages - 10} more</span>
        )}
      </div>
    </div>
  );
};

export default BookViewer;
