import React, { useRef, useCallback, useState, useEffect, forwardRef } from "react";
import HTMLFlipBook from "react-pageflip";
import { Document, Page as PDFPage, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileText, Loader2, BookOpen, File, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";

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
}

// Forward ref page component for react-pageflip (placeholder when no PDF)
const PlaceholderPage = forwardRef<HTMLDivElement, PageProps>(
  ({ pageNumber, width, height }, ref) => {
    return (
      <div
        ref={ref}
        className="book-page bg-white shadow-lg flex items-center justify-center overflow-hidden"
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Page {pageNumber}</h3>
          <p className="text-sm text-muted-foreground">PDF Preview</p>
        </div>
      </div>
    );
  }
);

PlaceholderPage.displayName = "PlaceholderPage";

// Forward ref page component for actual PDF rendering
const PDFBookPage = forwardRef<HTMLDivElement, PageProps>(
  ({ pageNumber, width, height }, ref) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    return (
      <div
        ref={ref}
        className="book-page bg-white shadow-lg flex items-center justify-center relative"
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {hasError ? (
          <div className="text-center p-4">
            <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Page {pageNumber}</p>
          </div>
        ) : (
          <PDFPage
            pageNumber={pageNumber}
            width={width}
            onLoadSuccess={() => setIsLoading(false)}
            onLoadError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="pdf-page"
          />
        )}
      </div>
    );
  }
);

PDFBookPage.displayName = "PDFBookPage";

const BookViewer: React.FC<BookViewerProps> = ({ 
  fileUrl, 
  totalPages: initialTotalPages = 12,
  onPageChange 
}) => {
  const flipBookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [numPages, setNumPages] = useState<number>(initialTotalPages);
  const [dimensions, setDimensions] = useState({ width: 300, height: 400 });
  const [pageAspectRatio, setPageAspectRatio] = useState(1.414);
  const [zoom, setZoom] = useState(100);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [isSinglePage, setIsSinglePage] = useState(true);
  const [goToPageInput, setGoToPageInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!viewerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await viewerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };
  // Calculate dimensions based on container size - fit full page without cropping
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;

        // Use the PDF's actual page aspect ratio when available
        const aspectRatio = pageAspectRatio;

        // The parent layout already targets ~90vw; use full container width here
        const targetWidthPercent = 1;
        const padding = 20;

        let pageWidth: number;

        if (isSinglePage) {
          pageWidth = (containerWidth * targetWidthPercent) - padding;
        } else {
          // Two pages side-by-side
          pageWidth = ((containerWidth * targetWidthPercent) - padding) / 2;
        }

        const pageHeight = pageWidth * aspectRatio;

        // Apply zoom factor
        const scaledWidth = (pageWidth * zoom) / 100;
        const scaledHeight = (pageHeight * zoom) / 100;

        setDimensions({
          width: Math.floor(Math.max(scaledWidth, 200)),
          height: Math.floor(Math.max(scaledHeight, 280))
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [zoom, isSinglePage, isFullscreen, pageAspectRatio]);

  const onDocumentLoadSuccess = async (pdf: any) => {
    setNumPages(pdf.numPages);
    setPdfLoaded(true);
    setPdfError(false);

    // Read the real PDF page size so we can avoid cropping for non-A4 documents
    try {
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });
      if (viewport?.width && viewport?.height) {
        setPageAspectRatio(viewport.height / viewport.width);
      }
    } catch {
      // Keep default aspect ratio
    }
  };

  const onDocumentLoadError = () => {
    setPdfError(true);
    setPdfLoaded(false);
    setPageAspectRatio(1.414);
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

  const goToPage = (pageNum: number) => {
    if (flipBookRef.current && pageNum >= 1 && pageNum <= numPages) {
      flipBookRef.current.pageFlip().flip(pageNum - 1);
      setCurrentPage(pageNum - 1);
    }
  };

  const handleGoToPage = () => {
    const pageNum = parseInt(goToPageInput, 10);
    if (!isNaN(pageNum)) {
      goToPage(pageNum);
      setGoToPageInput("");
    }
  };

  const handleGoToPageKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleGoToPage();
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

  // Get current page display text
  const getPageDisplayText = () => {
    if (isSinglePage) {
      return `Page ${currentPage + 1} of ${numPages}`;
    }
    return `Page ${currentPage + 1} - ${Math.min(currentPage + 2, numPages)} of ${numPages}`;
  };

  // Common flipbook props - allow larger sizes for 90vw layout
  const getFlipBookProps = () => ({
    ref: flipBookRef,
    width: dimensions.width,
    height: dimensions.height,
    size: "fixed" as const,
    minWidth: 200,
    maxWidth: 2000,
    minHeight: 280,
    maxHeight: 2800,
    showCover: true,
    mobileScrollSupport: true,
    onFlip: handleFlip,
    className: "book-flipbook",
    style: {},
    startPage: 0,
    drawShadow: true,
    flippingTime: 600,
    usePortrait: isSinglePage,
    startZIndex: 0,
    autoSize: false,
    maxShadowOpacity: 0.5,
    showPageCorners: true,
    disableFlipByClick: false,
    swipeDistance: 30,
    clickEventForward: true,
    useMouseEvents: true,
  });

  // Render the flipbook with placeholder pages (no PDF)
  const renderPlaceholderBook = () => (
    <HTMLFlipBook {...getFlipBookProps()}>
      {pages.map((pageNum) => (
        <PlaceholderPage
          key={pageNum}
          pageNumber={pageNum}
          width={dimensions.width}
          height={dimensions.height}
        />
      ))}
    </HTMLFlipBook>
  );

  // Render the flipbook with PDF pages
  const renderPDFBook = () => (
    <HTMLFlipBook {...getFlipBookProps()}>
      {pages.map((pageNum) => (
        <PDFBookPage
          key={pageNum}
          pageNumber={pageNum}
          width={dimensions.width}
          height={dimensions.height}
        />
      ))}
    </HTMLFlipBook>
  );

  return (
    <div 
      ref={viewerRef}
      className={`bg-card rounded-2xl border border-border shadow-lg overflow-hidden flex flex-col ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""
      }`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30 flex-wrap gap-2">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevPage}
            disabled={currentPage === 0}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[80px] text-center whitespace-nowrap">
            {getPageDisplayText()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextPage}
            disabled={isSinglePage ? currentPage >= numPages - 1 : currentPage >= numPages - 2}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Go to page */}
        <div className="flex items-center gap-1">
          <Input
            type="number"
            placeholder="Go to..."
            value={goToPageInput}
            onChange={(e) => setGoToPageInput(e.target.value)}
            onKeyDown={handleGoToPageKeyDown}
            className="w-20 h-8 text-sm"
            min={1}
            max={numPages}
          />
          <Button variant="outline" size="sm" onClick={handleGoToPage} className="h-8 px-2">
            Go
          </Button>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/50">
          <Toggle
            pressed={isSinglePage}
            onPressedChange={() => setIsSinglePage(true)}
            size="sm"
            className="h-7 px-2 data-[state=on]:bg-background"
            aria-label="Single page view"
          >
            <File className="h-4 w-4 mr-1" />
            <span className="text-xs">Single</span>
          </Toggle>
          <Toggle
            pressed={!isSinglePage}
            onPressedChange={() => setIsSinglePage(false)}
            size="sm"
            className="h-7 px-2 data-[state=on]:bg-background"
            aria-label="Double page view"
          >
            <BookOpen className="h-4 w-4 mr-1" />
            <span className="text-xs">Double</span>
          </Toggle>
        </div>

        {/* Zoom & Fullscreen controls */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={zoom <= 60} className="h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-10 text-center">{zoom}%</span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={zoom >= 150} className="h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleFullscreen} 
            className="h-8 w-8"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Book View Area - Height auto-adjusts based on content */}
      <div 
        ref={containerRef}
        className="relative bg-gradient-to-b from-muted/50 to-muted flex items-center justify-center"
        style={{ 
          minHeight: isFullscreen ? "auto" : `${dimensions.height + 40}px`,
          padding: "20px 0"
        }}
      >
        {/* Book shadow/binding effect - only show in double page mode */}
        {!isSinglePage && (
          <div className="absolute inset-y-0 left-1/2 w-4 -translate-x-1/2 bg-gradient-to-r from-black/10 via-black/20 to-black/10 z-10 pointer-events-none" />
        )}
        
        {/* PDF Document wrapper - provides context for PDF pages */}
        {fileUrl ? (
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Failed to load PDF</p>
              </div>
            }
          >
            {pdfLoaded && dimensions.width > 0 && renderPDFBook()}
          </Document>
        ) : (
          dimensions.width > 0 && renderPlaceholderBook()
        )}

        {!fileUrl && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-muted-foreground text-sm">
            <p>Click and drag pages to flip, or use the navigation buttons</p>
          </div>
        )}
      </div>

      {/* Page thumbnails indicator */}
      <div className="flex items-center justify-center gap-1 p-2 border-t border-border bg-muted/30">
        {pages.slice(0, Math.min(20, numPages)).map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => goToPage(pageNum)}
            className={`w-2 h-2 rounded-full transition-colors hover:scale-125 ${
              isSinglePage
                ? pageNum === currentPage + 1
                  ? "bg-primary"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                : pageNum >= currentPage + 1 && pageNum <= currentPage + 2
                  ? "bg-primary"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            aria-label={`Go to page ${pageNum}`}
          />
        ))}
        {numPages > 20 && (
          <span className="text-xs text-muted-foreground ml-2">+{numPages - 20} more</span>
        )}
      </div>
    </div>
  );
};

export default BookViewer;
