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
import { Heart, Loader2, Smartphone } from "lucide-react";
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
}: DonateModalProps) => {
  const { toast } = useToast();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(500);
  const [customAmount, setCustomAmount] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  const donationAmount = selectedAmount || Number(customAmount);

  const handleDonate = async () => {
    if (!donationAmount || donationAmount < 50) {
      toast({ title: "Invalid amount", description: "Minimum donation is KES 50", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter your name", variant: "destructive" });
      return;
    }
    if (!email) {
      toast({ title: "Email required", description: "Please enter your email for the receipt", variant: "destructive" });
      return;
    }
    if (!phone) {
      toast({ title: "Phone required", description: "Please enter your M-Pesa phone number", variant: "destructive" });
      return;
    }

    setProcessingPayment(true);
    try {
      const body: Record<string, unknown> = {
        document_id: documentId,
        amount: donationAmount,
        email,
        name: name.trim(),
        channel: "mobile_money",
        phone,
      };

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
            Send a donation securely via M-Pesa
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

          {/* Name */}
          <div>
            <p className="text-sm font-medium mb-2">Your name</p>
            <Input
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
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

          {/* Phone for M-Pesa */}
          <div>
            <p className="text-sm font-medium mb-2">M-Pesa phone number</p>
            <Input
              type="tel"
              placeholder="e.g. 0712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              You'll receive an STK push on this number to complete payment
            </p>
          </div>

          {/* Pay button */}
          <Button
            variant="hero"
            className="w-full gap-2"
            onClick={handleDonate}
            disabled={processingPayment || !donationAmount || donationAmount < 50 || !email || (paymentMethod === "mpesa" && !phone)}
          >
            {processingPayment ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : paymentMethod === "card" ? (
              <CreditCard className="h-4 w-4" />
            ) : (
              <Smartphone className="h-4 w-4" />
            )}
            {paymentMethod === "card" ? "Pay with Card" : "Pay via M-Pesa"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Secured by Paystack • KES {(donationAmount || 0).toLocaleString()}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DonateModal;
