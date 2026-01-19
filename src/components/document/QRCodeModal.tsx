import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Download, Copy, Check } from "lucide-react";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
}

const QRCodeModal = ({ open, onOpenChange, documentId, documentTitle }: QRCodeModalProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);

  const documentUrl = `${window.location.origin}/d/${documentId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(documentUrl);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Document link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    // Create canvas and draw SVG
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      ctx?.drawImage(img, 0, 0, 300, 300);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${documentTitle.replace(/[^a-z0-9]/gi, "_")}_qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      toast({
        title: "QR Code downloaded",
        description: "QR code image saved to your device",
      });
    };

    img.src = url;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">QR Code for {documentTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <div 
            ref={qrRef}
            className="bg-white p-4 rounded-xl shadow-sm"
          >
            <QRCodeSVG
              value={documentUrl}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Scan to view document</p>
            <code className="text-xs bg-muted px-2 py-1 rounded">{documentUrl}</code>
          </div>

          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
            <Button variant="default" className="flex-1" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download QR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeModal;
