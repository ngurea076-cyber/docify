import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, CheckCircle, XCircle, Eye, Shield, MessageCircle } from "lucide-react";
import Header from "@/components/layout/Header";
import AdminSupportChat from "@/components/chat/AdminSupportChat";

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [payouts, setPayouts] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Rejection dialog
  const [rejectDialog, setRejectDialog] = useState<{ type: "payout" | "withdrawal"; id: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Detail view
  const [viewPayout, setViewPayout] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) navigate("/login");
      else if (!isAdmin) navigate("/dashboard");
    }
  }, [user, authLoading, isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    const [payoutsRes, withdrawalsRes] = await Promise.all([
      supabase.from("creator_payouts").select("*").order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*").order("created_at", { ascending: false }),
    ]);

    setPayouts(payoutsRes.data || []);
    setWithdrawals(withdrawalsRes.data || []);
    setLoading(false);
  };

  const handlePayoutAction = async (payoutId: string, action: "approve" | "reject") => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-update-payout", {
        body: {
          payout_id: payoutId,
          action,
          rejection_reason: action === "reject" ? rejectionReason : undefined,
        },
      });
      if (error) throw error;
      toast({ title: "Success", description: `Payout ${action}d successfully` });
      setRejectDialog(null);
      setRejectionReason("");
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawalAction = async (withdrawalId: string, action: "approve" | "reject") => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-withdrawal", {
        body: {
          withdrawal_id: withdrawalId,
          action,
          admin_note: action === "reject" ? rejectionReason : undefined,
        },
      });
      if (error) throw error;
      toast({ title: "Success", description: `Withdrawal ${action}d successfully` });
      setRejectDialog(null);
      setRejectionReason("");
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const pendingPayouts = payouts.filter(p => p.status === "pending");
  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage verifications and withdrawals</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending Verifications</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingPayouts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending Withdrawals</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingWithdrawals.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Creators</p>
              <p className="text-2xl font-bold">{payouts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Withdrawals</p>
              <p className="text-2xl font-bold">{withdrawals.length}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="verifications">
          <TabsList className="mb-6">
            <TabsTrigger value="verifications">
              Verifications {pendingPayouts.length > 0 && <Badge variant="secondary" className="ml-2">{pendingPayouts.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="withdrawals">
              Withdrawals {pendingWithdrawals.length > 0 && <Badge variant="secondary" className="ml-2">{pendingWithdrawals.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="support">
              <MessageCircle className="h-4 w-4 mr-1" />
              Support
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verifications">
            <Card>
              <CardHeader>
                <CardTitle>Creator Verifications</CardTitle>
                <CardDescription>Review and approve creator payout applications</CardDescription>
              </CardHeader>
              <CardContent>
                {payouts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No verification requests</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Bank</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.business_name}</TableCell>
                          <TableCell>{p.account_holder_name}</TableCell>
                          <TableCell>{p.bank_name}</TableCell>
                          <TableCell>
                            <Badge variant={p.status === "approved" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => setViewPayout(p)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {p.status === "pending" && (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => handlePayoutAction(p.id, "approve")} disabled={actionLoading}>
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setRejectDialog({ type: "payout", id: p.id })} disabled={actionLoading}>
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals">
            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Requests</CardTitle>
                <CardDescription>Review and process creator withdrawal requests</CardDescription>
              </CardHeader>
              <CardContent>
                {withdrawals.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No withdrawal requests</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.map(w => (
                        <TableRow key={w.id}>
                          <TableCell className="font-mono text-xs">{w.user_id.slice(0, 8)}...</TableCell>
                          <TableCell>KES {(w.amount / 100).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={w.status === "completed" ? "default" : w.status === "failed" ? "destructive" : "secondary"}>
                              {w.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(w.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {w.status === "pending" && (
                              <div className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={() => handleWithdrawalAction(w.id, "approve")} disabled={actionLoading}>
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setRejectDialog({ type: "withdrawal", id: w.id })} disabled={actionLoading}>
                                  <XCircle className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support">
            <AdminSupportChat />
          </TabsContent>
        </Tabs>

        {/* View Payout Detail */}
        <Dialog open={!!viewPayout} onOpenChange={() => setViewPayout(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Payout Details</DialogTitle>
            </DialogHeader>
            {viewPayout && (
              <PayoutDetailView payout={viewPayout} />
            )}
          </DialogContent>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject {rejectDialog?.type === "payout" ? "Verification" : "Withdrawal"}</DialogTitle>
              <DialogDescription>Provide a reason for rejection</DialogDescription>
            </DialogHeader>
            <Textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection..."
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (rejectDialog?.type === "payout") handlePayoutAction(rejectDialog.id, "reject");
                  else if (rejectDialog) handleWithdrawalAction(rejectDialog.id, "reject");
                }}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminDashboard;
