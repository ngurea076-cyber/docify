import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Upload, CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";
import Header from "@/components/layout/Header";

interface Bank {
  name: string;
  code: string;
}

interface PayoutData {
  id: string;
  status: string;
  rejection_reason: string | null;
  business_name: string;
  account_holder_name: string;
  email: string;
  phone: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  national_id: string;
  id_document_url: string;
}

const PayoutSettings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [payout, setPayout] = useState<PayoutData | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [businessName, setBusinessName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPayout();
      fetchBanks();
      setEmail(user.email || "");
    }
  }, [user]);

  const fetchPayout = async () => {
    const { data } = await supabase
      .from("creator_payouts")
      .select("*")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (data) {
      setPayout(data as PayoutData);
      setBusinessName(data.business_name);
      setAccountHolderName(data.account_holder_name);
      setEmail(data.email);
      setPhone(data.phone);
      setBankCode(data.bank_code);
      setBankName(data.bank_name);
      setAccountNumber(data.account_number);
      setNationalId(data.national_id);
    }
    setLoading(false);
  };

  const fetchBanks = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("paystack-banks");
      if (error) throw error;
      if (data?.data) {
        setBanks(data.data.map((b: any) => ({ name: b.name, code: b.code })));
      }
    } catch {
      toast({ title: "Error", description: "Failed to load banks", variant: "destructive" });
    } finally {
      setLoadingBanks(false);
    }
  };

  const handleBankSelect = (code: string) => {
    setBankCode(code);
    const bank = banks.find(b => b.code === code);
    if (bank) setBankName(bank.name);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!businessName || !accountHolderName || !email || !phone || !bankCode || !accountNumber || !nationalId) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    if (!termsAccepted && !payout) {
      toast({ title: "Error", description: "Please accept the terms", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let idDocUrl = payout?.id_document_url || "";

      if (idFile) {
        const fileExt = idFile.name.split(".").pop();
        const filePath = `${user.id}/id-document.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("id-documents")
          .upload(filePath, idFile, { upsert: true });
        if (uploadError) throw uploadError;
        idDocUrl = filePath;
      }

      if (!idDocUrl) {
        toast({ title: "Error", description: "Please upload your government ID", variant: "destructive" });
        setSaving(false);
        return;
      }

      const payoutData = {
        user_id: user.id,
        business_name: businessName,
        account_holder_name: accountHolderName,
        email,
        phone,
        bank_code: bankCode,
        bank_name: bankName,
        account_number: accountNumber,
        national_id: nationalId,
        id_document_url: idDocUrl,
        terms_accepted: true,
        status: "pending" as const,
      };

      if (payout) {
        const { error } = await supabase.from("creator_payouts").update({
          ...payoutData,
          status: "pending",
        }).eq("id", payout.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("creator_payouts").insert(payoutData);
        if (error) throw error;
      }

      toast({ title: "Success", description: "Payout details submitted for verification" });
      fetchPayout();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const statusConfig = {
    pending: { icon: Clock, label: "Pending Verification", variant: "secondary" as const, color: "text-yellow-600" },
    approved: { icon: CheckCircle2, label: "Approved", variant: "default" as const, color: "text-green-600" },
    rejected: { icon: XCircle, label: "Rejected", variant: "destructive" as const, color: "text-red-600" },
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentStatus = payout ? statusConfig[payout.status as keyof typeof statusConfig] : null;
  const canEdit = !payout || payout.status === "rejected";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">Payout Settings</h1>
          <p className="text-muted-foreground mb-8">Connect your bank account to receive earnings</p>

          {currentStatus && (
            <Card className="mb-6">
              <CardContent className="flex items-center gap-3 p-4">
                <currentStatus.icon className={`h-5 w-5 ${currentStatus.color}`} />
                <div className="flex-1">
                  <p className="font-medium">{currentStatus.label}</p>
                  {payout?.status === "pending" && (
                    <p className="text-sm text-muted-foreground">Admin verification may take up to 24 hours</p>
                  )}
                  {payout?.status === "rejected" && payout.rejection_reason && (
                    <p className="text-sm text-destructive">{payout.rejection_reason}</p>
                  )}
                </div>
                <Badge variant={currentStatus.variant}>{payout?.status}</Badge>
              </CardContent>
            </Card>
          )}

          {canEdit ? (
            <Card>
              <CardHeader>
                <CardTitle>{payout ? "Resubmit Payout Details" : "Payout Connection"}</CardTitle>
                <CardDescription>Complete this form to start receiving earnings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="p-4 bg-accent/50 rounded-lg border border-accent">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      The platform charges a <strong>5% commission</strong> on every successful sale.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Business Name *</Label>
                  <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Your business name" />
                </div>

                <div className="space-y-2">
                  <Label>Account Holder Full Name *</Label>
                  <Input value={accountHolderName} onChange={e => setAccountHolderName(e.target.value)} placeholder="Full name as on bank account" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email Address *</Label>
                    <Input value={email} onChange={e => setEmail(e.target.value)} type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254..." />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Settlement Bank *</Label>
                    <Select value={bankCode} onValueChange={handleBankSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingBanks ? "Loading banks..." : "Select bank"} />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.map(bank => (
                          <SelectItem key={bank.code} value={bank.code}>{bank.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Bank Account Number *</Label>
                    <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account number" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>National ID Number *</Label>
                  <Input value={nationalId} onChange={e => setNationalId(e.target.value)} placeholder="National ID" />
                </div>

                <div className="space-y-2">
                  <Label>Government ID Upload *</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={e => setIdFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="id-upload"
                    />
                    <label htmlFor="id-upload" className="cursor-pointer flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {idFile ? idFile.name : payout?.id_document_url ? "Replace existing ID" : "Upload ID (image or PDF)"}
                      </span>
                    </label>
                  </div>
                </div>

                {!payout && (
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    />
                    <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                      I agree to the platform terms and understand that a 5% commission will be deducted from every successful sale.
                    </label>
                  </div>
                )}

                <Button onClick={handleSubmit} disabled={saving} className="w-full">
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : "Submit for Verification"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Payout Details</CardTitle>
                <CardDescription>Your verified payout information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Business:</span> <span className="font-medium">{payout?.business_name}</span></div>
                  <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{payout?.account_holder_name}</span></div>
                  <div><span className="text-muted-foreground">Bank:</span> <span className="font-medium">{payout?.bank_name}</span></div>
                  <div><span className="text-muted-foreground">Account:</span> <span className="font-medium">{payout?.account_number}</span></div>
                  <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{payout?.phone}</span></div>
                  <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{payout?.email}</span></div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default PayoutSettings;
