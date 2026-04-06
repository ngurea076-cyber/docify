import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface PayoutDetailViewProps {
  payout: any;
}

const PayoutDetailView = ({ payout }: PayoutDetailViewProps) => {
  const [idFrontUrl, setIdFrontUrl] = useState<string | null>(null);
  const [idBackUrl, setIdBackUrl] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState(true);

  useEffect(() => {
    const loadImages = async () => {
      setLoadingImages(true);
      const urls = await Promise.all([
        payout.id_document_url
          ? supabase.storage.from("id-documents").createSignedUrl(payout.id_document_url, 3600)
          : Promise.resolve({ data: null }),
        payout.id_document_back_url
          ? supabase.storage.from("id-documents").createSignedUrl(payout.id_document_back_url, 3600)
          : Promise.resolve({ data: null }),
      ]);
      setIdFrontUrl(urls[0].data?.signedUrl || null);
      setIdBackUrl(urls[1].data?.signedUrl || null);
      setLoadingImages(false);
    };
    loadImages();
  }, [payout]);

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div><span className="text-muted-foreground">Business:</span><br /><strong>{payout.business_name}</strong></div>
        <div><span className="text-muted-foreground">Name:</span><br /><strong>{payout.account_holder_name}</strong></div>
        <div><span className="text-muted-foreground">Email:</span><br /><strong>{payout.email}</strong></div>
        <div><span className="text-muted-foreground">Phone:</span><br /><strong>{payout.phone}</strong></div>
        <div><span className="text-muted-foreground">Bank:</span><br /><strong>{payout.bank_name}</strong></div>
        <div><span className="text-muted-foreground">Account:</span><br /><strong>{payout.account_number}</strong></div>
        <div><span className="text-muted-foreground">National ID:</span><br /><strong>{payout.national_id}</strong></div>
      </div>

      <div className="space-y-3 pt-2 border-t border-border">
        <p className="font-medium">ID Documents</p>
        {loadingImages ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Front</p>
              {idFrontUrl ? (
                <a href={idFrontUrl} target="_blank" rel="noopener noreferrer">
                  <img src={idFrontUrl} alt="ID Front" className="w-full rounded-lg border border-border object-cover max-h-48" />
                </a>
              ) : (
                <p className="text-muted-foreground text-xs">Not uploaded</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Back</p>
              {idBackUrl ? (
                <a href={idBackUrl} target="_blank" rel="noopener noreferrer">
                  <img src={idBackUrl} alt="ID Back" className="w-full rounded-lg border border-border object-cover max-h-48" />
                </a>
              ) : (
                <p className="text-muted-foreground text-xs">Not uploaded</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayoutDetailView;
