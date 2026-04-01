import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Wallet, TrendingUp, Clock, ArrowDownToLine, DollarSign } from "lucide-react";
import Header from "@/components/layout/Header";

const MIN_WITHDRAWAL = 500; // KES

const Earnings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [balance, setBalance] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [payoutStatus, setPayoutStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    const [balanceRes, withdrawalsRes, payoutRes] = await Promise.all([
      supabase.from("creator_balances").select("*").eq("user_id", user?.id).maybeSingle(),
      supabase.from("withdrawals").select("*").eq("user_id", user?.id).order("created_at", { ascending: false }),
      supabase.from("creator_payouts").select("status").eq("user_id", user?.id).maybeSingle(),
    ]);

    setBalance(balanceRes.data);
    setWithdrawals(withdrawalsRes.data || []);
    setPayoutStatus(payoutRes.data?.status || null);
    setLoading(false);
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount);
    if (isNaN(amount) || amount < MIN_WITHDRAWAL) {
      toast({ title: "Error", description: `Minimum withdrawal is KES ${MIN_WITHDRAWAL}`, variant: "destructive" });
      return;
    }
    if (amount > (balance?.available_balance || 0)) {
      toast({ title: "Error", description: "Insufficient balance", variant: "destructive" });
      return;
    }

    setWithdrawing(true);
    try {
      const { error } = await supabase.from("withdrawals").insert({
        user_id: user!.id,
        amount,
        status: "pending",
      });
      if (error) throw error;

      // Deduct from available balance
      const { error: balanceError } = await supabase.from("creator_balances").update({
        available_balance: (balance?.available_balance || 0) - amount,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user!.id);
      if (balanceError) throw balanceError;

      toast({ title: "Success", description: "Withdrawal request submitted" });
      setWithdrawModalOpen(false);
      setWithdrawAmount("");
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setWithdrawing(false);
    }
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      processing: "outline",
      completed: "default",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canWithdraw = payoutStatus === "approved" && (balance?.available_balance || 0) >= MIN_WITHDRAWAL;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Earnings</h1>
              <p className="text-muted-foreground">Track your earnings and manage withdrawals</p>
            </div>
            <Button onClick={() => setWithdrawModalOpen(true)} disabled={!canWithdraw}>
              <ArrowDownToLine className="h-4 w-4 mr-2" /> Withdraw Funds
            </Button>
          </div>

          {payoutStatus !== "approved" && (
            <Card className="mb-6 border-yellow-500/50">
              <CardContent className="flex items-center gap-3 p-4">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div className="flex-1">
                  <p className="font-medium">
                    {!payoutStatus ? "Payout account not connected" : payoutStatus === "pending" ? "Verification pending" : "Payout account rejected"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {!payoutStatus
                      ? "Connect your payout details to withdraw earnings"
                      : "You cannot withdraw until your account is approved"}
                  </p>
                </div>
                {!payoutStatus && (
                  <Button variant="outline" onClick={() => navigate("/payout-settings")}>Connect</Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Total Earnings</span>
                </div>
                <p className="text-2xl font-bold">KES {((balance?.total_earnings || 0) / 100).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Wallet className="h-4 w-4" />
                  <span className="text-sm">Available Balance</span>
                </div>
                <p className="text-2xl font-bold text-green-600">KES {((balance?.available_balance || 0) / 100).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Pending Earnings</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">KES {((balance?.pending_earnings || 0) / 100).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Total Withdrawn</span>
                </div>
                <p className="text-2xl font-bold">KES {((balance?.total_withdrawn || 0) / 100).toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Withdrawal History */}
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal History</CardTitle>
              <CardDescription>Your past and pending withdrawal requests</CardDescription>
            </CardHeader>
            <CardContent>
              {withdrawals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No withdrawal requests yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map(w => (
                      <TableRow key={w.id}>
                        <TableCell>{new Date(w.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>KES {(w.amount / 100).toLocaleString()}</TableCell>
                        <TableCell>{statusBadge(w.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{w.admin_note || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Withdraw Modal */}
        <Dialog open={withdrawModalOpen} onOpenChange={setWithdrawModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Withdraw Funds</DialogTitle>
              <DialogDescription>
                Available: KES {((balance?.available_balance || 0) / 100).toLocaleString()} · Min: KES {(MIN_WITHDRAWAL / 100).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Amount in KES (smallest unit)"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter amount in cents (e.g., 50000 = KES 500)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWithdrawModalOpen(false)}>Cancel</Button>
              <Button onClick={handleWithdraw} disabled={withdrawing}>
                {withdrawing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : "Confirm Withdrawal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Earnings;
