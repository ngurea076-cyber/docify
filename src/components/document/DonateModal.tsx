import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Heart, Loader2, CreditCard, Smartphone, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DonateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  creatorUsername: string | null;
  mpesaPaybill: string | null;
  mpesaTill: string | null;
}

const PRESET_AMOUNTS = [100, 500, 1000, 5000];

const DonateModal = ({
  open,
  onOpenChange,
  documentId,
  creatorUsername,
  mpesaPaybill,
  mpesaTill,
}: DonateModalProps) => {
  const { toast } = useToast();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(500);
  const [customAmount, setCustomAmount] = useState("");
  const [email, setEmail] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [copiedPayment, setCopiedPayment] = useState<string | null>(null);
  const [showManualMpesa, setShowManualMpesa] = useState(false);

  const donationAmount = selectedAmount || Number(customAmount);
  const hasMpesa = Boolean(mpesaPaybill || mpesaTill);

  const handleCopyPayment = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    setCopiedPayment(label);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
    setTimeout(() => setCopiedPayment(null), 2000);
  };

  const handlePaystackDonate = async (channel?: string) => {
    if (!donationAmount || donationAmount < 50) {
      toast({ title: "Invalid amount", description: "Minimum donation is KES 50", variant: "destructive" });
      return;
    }
    if (!email) {
      toast({ title: "Email required", description: "Please enter your email for the receipt", variant: "destructive" });
      return;
    }

    setProcessingPayment(true);
    try {
      const body: Record<string, unknown> = { document_id: documentId, amount: donationAmount, email };
      if (channel) body.channel = channel;

      const { data, error } = await supabase.functions.invoke("create-donation", { body });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.authorization_url) {
        window.open(data.authorization_url, "_blank");
        onOpenChange(false);
        toast({ title: "Redirecting to payment...", description: "Complete your donation in the new tab" });
      }
    } catch (err: any) {
      console.error("Donation error:", err);
      toast({
        title: "Payment failed",
        description: err.message || "Could not initialize payment",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-accent" />
            Support {creatorUsername || "the creator"}
          </DialogTitle>
          <DialogDescription>
            Send a donation securely via card or M-Pesa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount selection */}
          <div>
            <p className="text-sm font-medium mb-2">Select amount (KES)</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_AMOUNTS.map((amt) => (
                <Button
                  key={amt}
                  variant={selectedAmount === amt ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setSelectedAmount(amt); setCustomAmount(""); }}
                >
                  {amt.toLocaleString()}
                </Button>
              ))}
            </div>
            <div className="mt-2">
              <Input
                type="number"
                placeholder="Custom amount (min KES 50)"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                min={50}
                max={1000000}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <p className="text-sm font-medium mb-2">Your email</p>
            <Input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Payment buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="hero"
              className="gap-2"
              onClick={() => handlePaystackDonate()}
              disabled={processingPayment || !donationAmount || donationAmount < 50 || !email}
            >
              {processingPayment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Pay with Card
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handlePaystackDonate("mobile_money")}
              disabled={processingPayment || !donationAmount || donationAmount < 50 || !email}
            >
              {processingPayment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Smartphone className="h-4 w-4" />
              )}
              M-Pesa
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Secured by Paystack • KES {(donationAmount || 0).toLocaleString()}
          </p>

          {/* Manual M-Pesa fallback */}
          {hasMpesa && (
            <div className="pt-2 border-t border-border">
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
                onClick={() => setShowManualMpesa(!showManualMpesa)}
              >
                {showManualMpesa ? "Hide" : "Or pay manually via M-Pesa"}
              </button>

              {showManualMpesa && (
                <div className="mt-3 space-y-3">
                  {mpesaPaybill && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Paybill</p>
                        <p className="text-lg font-bold">{mpesaPaybill}</p>
                      </div>
                      <Button variant="outline" size="icon" onClick={() => handleCopyPayment(mpesaPaybill, "Paybill")}>
                        {copiedPayment === "Paybill" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                  {mpesaTill && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Till Number</p>
                        <p className="text-lg font-bold">{mpesaTill}</p>
                      </div>
                      <Button variant="outline" size="icon" onClick={() => handleCopyPayment(mpesaTill, "Till")}>
                        {copiedPayment === "Till" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DonateModal;
