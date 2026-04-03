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
import { Heart, Copy, Check, Loader2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [copiedPayment, setCopiedPayment] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(500);
  const [customAmount, setCustomAmount] = useState("");
  const [email, setEmail] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  const handleCopyPayment = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    setCopiedPayment(label);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
    setTimeout(() => setCopiedPayment(null), 2000);
  };

  const donationAmount = selectedAmount || Number(customAmount);

  const handlePaystackDonate = async () => {
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
      const { data, error } = await supabase.functions.invoke("create-donation", {
        body: { document_id: documentId, amount: donationAmount, email },
      });

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

  const hasMpesa = Boolean(mpesaPaybill || mpesaTill);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-accent" />
            Support {creatorUsername || "the creator"}
          </DialogTitle>
          <DialogDescription>
            Choose how you'd like to donate
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="online" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="online" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Card / Mobile
            </TabsTrigger>
            <TabsTrigger value="mpesa" className="gap-2">
              M-Pesa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="online" className="space-y-4 pt-2">
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
                  placeholder="Custom amount"
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

            <Button
              variant="hero"
              className="w-full gap-2"
              onClick={handlePaystackDonate}
              disabled={processingPayment || !donationAmount || donationAmount < 50 || !email}
            >
              {processingPayment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Donate KES {(donationAmount || 0).toLocaleString()}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Secured by Paystack. You'll be redirected to complete payment.
            </p>
          </TabsContent>

          <TabsContent value="mpesa" className="space-y-4 pt-2">
            {mpesaPaybill && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Paybill Number</p>
                  <p className="text-xl font-bold mt-1">{mpesaPaybill}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopyPayment(mpesaPaybill, "Paybill")}
                >
                  {copiedPayment === "Paybill" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}

            {mpesaPaybill && mpesaTill && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>
            )}

            {mpesaTill && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Till Number</p>
                  <p className="text-xl font-bold mt-1">{mpesaTill}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopyPayment(mpesaTill, "Till")}
                >
                  {copiedPayment === "Till" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}

            {!hasMpesa && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">The creator hasn't set up M-Pesa details yet.</p>
              </div>
            )}

            {hasMpesa && (
              <p className="text-xs text-muted-foreground text-center">
                Open your M-Pesa app, select Lipa na M-Pesa, then use the {mpesaPaybill ? "Pay Bill" : "Buy Goods"} option with the number above.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default DonateModal;
