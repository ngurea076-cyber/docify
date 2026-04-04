import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Upload,
  Search,
  BarChart3,
  Eye,
  Download,
  QrCode,
  Link2,
  MoreVertical,
  Plus,
  Settings,
  LogOut,
  Bell,
  ChevronDown,
  User,
  CreditCard,
  Loader2,
  Pencil,
  Trash2,
  Camera,
  ExternalLink,
  Shield,
} from "lucide-react";
import DocumentCard from "@/components/document/DocumentCard";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import UploadPDFModal, { DocumentData } from "@/components/upload/UploadPDFModal";
import QRCodeModal from "@/components/document/QRCodeModal";

interface Document {
  id: string;
  title: string;
  description: string | null;
  view_count: number;
  download_count: number;
  is_public: boolean;
  created_at: string;
  allow_downloads: boolean;
  allow_donations: boolean;
  allow_comments: boolean;
  document_type: "menu" | "brochure" | "pricelist" | "event" | "notice" | "other";
  country: string | null;
  city: string | null;
  area: string | null;
  google_maps_url: string | null;
  file_name: string | null;
  file_size: number | null;
  file_url: string;
  order_url: string | null;
  thumbnail_url: string | null;
  slug?: string | null;
}

interface Profile {
  id: string;
  username: string | null;
  mpesa_paybill: string | null;
  mpesa_till: string | null;
}

const Dashboard = () => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  
  // QR Code modal state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedDocForQR, setSelectedDocForQR] = useState<{ id: string; title: string } | null>(null);
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentData | null>(null);
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Profile form states
  const [username, setUsername] = useState("");
  const [paybill, setPaybill] = useState("");
  const [tillNumber, setTillNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [bio, setBio] = useState("");
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDocuments();
      fetchProfile();
    }
  }, [user]);

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from("documents")
      .select("id, title, description, view_count, download_count, is_public, created_at, allow_downloads, allow_donations, allow_comments, document_type, country, city, area, google_maps_url, file_name, file_size, file_url, order_url, thumbnail_url")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });
    
    if (data) {
      setDocuments(data);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setUsername(data.username || "");
        setPaybill(data.mpesa_paybill || "");
        setTillNumber(data.mpesa_till || "");
        setAvatarUrl(data.avatar_url || null);
        setBio(data.bio || "");
      }
    } catch (error) {
      console.error("Failed to load profile", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          username: username.trim() || null,
          mpesa_paybill: paybill.trim() || null,
          mpesa_till: tillNumber.trim() || null,
          avatar_url: avatarUrl,
          bio: bio.trim() || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      
      fetchProfile();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    
    const file = e.target.files[0];
    const maxSize = 2 * 1024 * 1024; // 2MB
    
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload an image under 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("pdfs")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("pdfs")
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      
      // Update profile with new avatar URL
      await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          avatar_url: publicUrl,
        });

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleCopyLink = (docSlug: string) => {
    const url = `${window.location.origin}/d/${docSlug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "Document link copied to clipboard",
    });
  };

  const handleOpenQR = (doc: { id: string; title: string }) => {
    setSelectedDocForQR(doc);
    setQrModalOpen(true);
  };

  const handleEditDocument = (doc: Document) => {
    setEditingDocument({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      allow_downloads: doc.allow_downloads,
      allow_donations: doc.allow_donations,
      allow_comments: doc.allow_comments,
      is_public: doc.is_public,
      document_type: doc.document_type,
      country: doc.country,
      city: doc.city,
      area: doc.area,
      google_maps_url: doc.google_maps_url,
      file_name: doc.file_name,
      file_size: doc.file_size,
      file_url: doc.file_url,
      order_url: doc.order_url,
      thumbnail_url: doc.thumbnail_url,
    });
    setEditModalOpen(true);
  };

  const handleDeleteDocument = async () => {
    if (!deletingDocument) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", deletingDocument.id);

      if (error) throw error;

      toast({
        title: "Document deleted",
        description: `"${deletingDocument.title}" has been removed`,
      });
      
      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingDocument(null);
    }
  };

  const [creatorBalance, setCreatorBalance] = useState<any>(null);
  const [payoutStatus, setPayoutStatus] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPaymentData();
    }
  }, [user]);

  const fetchPaymentData = async () => {
    const [balanceRes, payoutRes] = await Promise.all([
      supabase.from("creator_balances").select("*").eq("user_id", user?.id).maybeSingle(),
      supabase.from("creator_payouts").select("status").eq("user_id", user?.id).maybeSingle(),
    ]);
    setCreatorBalance(balanceRes.data);
    setPayoutStatus(payoutRes.data?.status || null);
  };

  const totalViews = documents.reduce((sum, d) => sum + d.view_count, 0);
  const totalDownloads = documents.reduce((sum, d) => sum + d.download_count, 0);

  const stats = [
    { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye },
    { label: "Downloads", value: totalDownloads.toLocaleString(), icon: Download },
    { label: "Documents", value: documents.length.toString(), icon: FileText },
    { label: "Available Balance", value: `KES ${((creatorBalance?.available_balance || 0) / 100).toLocaleString()}`, icon: CreditCard },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userInitials = user.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : user.email?.substring(0, 2).toUpperCase() || "U";

  const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 bottom-0 w-64 bg-card border-r border-border hidden lg:block">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">PDFShare</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <NavButton 
              icon={BarChart3} 
              label="Dashboard" 
              active={activeSection === "dashboard"} 
              onClick={() => setActiveSection("dashboard")}
            />
            <NavButton 
              icon={FileText} 
              label="Documents" 
              active={activeSection === "documents"} 
              onClick={() => setActiveSection("documents")}
            />
            <NavButton 
              icon={CreditCard}
              label="Earnings" 
              active={false} 
              onClick={() => navigate("/earnings")}
            />
            <NavButton 
              icon={Settings}
              label="Payout Settings" 
              active={false} 
              onClick={() => navigate("/payout-settings")}
            />
            <NavButton 
              icon={User} 
              label="Profile" 
              active={activeSection === "profile"} 
              onClick={() => setActiveSection("profile")}
            />
            {profile?.username && (
              <NavButton 
                icon={ExternalLink} 
                label="Public Profile" 
                active={false} 
                onClick={() => navigate(`/u/${profile.username}`)}
              />
            )}
            <div className="pt-4 mt-4 border-t border-border space-y-1">
              {isAdmin && (
                <NavButton 
                  icon={Shield} 
                  label="Admin Dashboard" 
                  active={false} 
                  onClick={() => navigate("/admin")}
                />
              )}
              <NavButton 
                icon={LogOut} 
                label="Sign Out" 
                active={false} 
                onClick={handleSignOut}
              />
            </div>
          </nav>

          {/* User */}
          <div className="p-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">{userInitials}</span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{userName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setActiveSection("profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveSection("profile")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center gap-4">
              <div className="lg:hidden">
                <Link to="/" className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                    <FileText className="h-4 w-4 text-primary-foreground" />
                  </div>
                </Link>
              </div>
              <h1 className="text-xl font-semibold capitalize">{activeSection}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setActiveSection("profile")}
                className={activeSection === "profile" ? "bg-muted" : ""}
              >
                <User className="h-5 w-5" />
              </Button>
              <Button variant="hero" size="sm" className="gap-2" onClick={() => setUploadModalOpen(true)}>
                <Upload className="h-4 w-4" />
                Upload PDF
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {activeSection === "dashboard" && (
            <>
              {/* Welcome */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-1">Welcome back, {userName.split(" ")[0]}!</h2>
                <p className="text-muted-foreground">Here's what's happening with your documents.</p>
              </div>

              {/* Stats Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-card rounded-xl border border-border p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">{stat.label}</span>
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <stat.icon className="h-4 w-4 text-accent" />
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-bold">{stat.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Quick Actions */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/earnings")}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold">Earnings & Withdrawals</p>
                        <p className="text-sm text-muted-foreground">
                          Total: KES {((creatorBalance?.total_earnings || 0) / 100).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/payout-settings")}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Settings className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold">Payout Settings</p>
                        <p className="text-sm text-muted-foreground">
                          {!payoutStatus ? "Not connected" : payoutStatus === "approved" ? "Approved" : payoutStatus === "pending" ? "Pending verification" : "Rejected"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {profile?.username && (
                  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/u/${profile.username}`)}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <ExternalLink className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold">Public Profile</p>
                          <p className="text-sm text-muted-foreground">View your public page</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Documents Section */}
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-lg font-semibold">Your Documents</h2>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search documents..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 w-full sm:w-64"
                      />
                    </div>
                    <Button variant="hero" size="sm" className="gap-2 shrink-0" onClick={() => setUploadModalOpen(true)}>
                      <Plus className="h-4 w-4" />
                      Upload
                    </Button>
                  </div>
                </div>

                {/* Documents Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {documents.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      onCopyLink={handleCopyLink}
                      onOpenQR={handleOpenQR}
                      onEdit={handleEditDocument}
                      onDelete={(d) => {
                        setDeletingDocument(d);
                        setDeleteDialogOpen(true);
                      }}
                    />
                  ))}
                </div>

                {documents.length === 0 && (
                  <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Upload your first PDF to get started
                    </p>
                    <Button variant="hero" onClick={() => setUploadModalOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload PDF
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {activeSection === "documents" && (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-lg font-semibold">All Documents</h2>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search documents..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 w-full sm:w-64"
                    />
                  </div>
                  <Button variant="hero" size="sm" className="gap-2 shrink-0" onClick={() => setUploadModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Upload
                  </Button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onCopyLink={handleCopyLink}
                    onOpenQR={handleOpenQR}
                    onEdit={handleEditDocument}
                    onDelete={(d) => {
                      setDeletingDocument(d);
                      setDeleteDialogOpen(true);
                    }}
                  />
                ))}
              </div>

              {documents.length === 0 && (
                <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload your first PDF to get started
                  </p>
                  <Button variant="hero" onClick={() => setUploadModalOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload PDF
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeSection === "donations" && (
            <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Donations</h3>
              <p className="text-muted-foreground mb-4">
                Track donations from your documents here. Set up your M-Pesa details in your profile to start receiving donations.
              </p>
              <Button variant="outline" onClick={() => setActiveSection("profile")}>
                <CreditCard className="h-4 w-4 mr-2" />
                Set Up Payment
              </Button>
            </div>
          )}

          {activeSection === "profile" && (
            <div className="max-w-2xl">
              <Card>
                    <CardHeader>
                      <CardTitle>Profile Information</CardTitle>
                      <CardDescription>
                        Update your profile details visible to others
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Avatar Upload */}
                      <div className="flex items-center gap-6">
                        <div className="relative group">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt="Profile"
                              className="w-20 h-20 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center">
                              <span className="text-2xl font-bold text-primary">
                                {username ? username.slice(0, 2).toUpperCase() : "?"}
                              </span>
                            </div>
                          )}
                          <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            {uploadingAvatar ? (
                              <Loader2 className="h-6 w-6 text-white animate-spin" />
                            ) : (
                              <Camera className="h-6 w-6 text-white" />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleAvatarUpload}
                              className="hidden"
                              disabled={uploadingAvatar}
                            />
                          </label>
                        </div>
                        <div>
                          <p className="font-medium">Profile Picture</p>
                          <p className="text-sm text-muted-foreground">
                            Click to upload (max 2MB)
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={user?.email || ""}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Email cannot be changed
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          type="text"
                          placeholder="Enter your username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          This will be displayed on your public documents
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio / Description</Label>
                        <Textarea
                          id="bio"
                          placeholder="Tell viewers a bit about yourself or your business..."
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows={3}
                          maxLength={300}
                        />
                        <p className="text-xs text-muted-foreground">
                          {bio.length}/300 characters - shown below your documents
                        </p>
                      </div>

                      <Button 
                        onClick={handleSaveProfile} 
                        disabled={savingProfile}
                        className="w-full"
                      >
                        {savingProfile ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Profile"
                        )}
                      </Button>

                      {/* Payment & Payout Quick Links */}
                      <div className="border-t border-border pt-6 space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Payment & Payouts</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => navigate("/payout-settings")}>
                            <Settings className="h-4 w-4" />
                            <div className="text-left">
                              <p className="text-sm font-medium">Payout Settings</p>
                              <p className="text-xs text-muted-foreground">
                                {!payoutStatus ? "Connect your bank" : payoutStatus === "approved" ? "Approved ✓" : payoutStatus === "pending" ? "Pending verification" : "Needs attention"}
                              </p>
                            </div>
                          </Button>
                          <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => navigate("/earnings")}>
                            <CreditCard className="h-4 w-4" />
                            <div className="text-left">
                              <p className="text-sm font-medium">Earnings & Withdrawals</p>
                              <p className="text-xs text-muted-foreground">
                                Balance: KES {((creatorBalance?.available_balance || 0) / 100).toLocaleString()}
                              </p>
                            </div>
                          </Button>
                        </div>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-border pt-6">
                        <Button 
                          variant="outline" 
                          className="w-full justify-center gap-2 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                          onClick={handleSignOut}
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
            </div>
          )}
        </div>
      </main>

      <UploadPDFModal 
        open={uploadModalOpen} 
        onOpenChange={setUploadModalOpen}
        onSuccess={fetchDocuments}
        hasPaymentMethod={!!(profile?.mpesa_paybill || profile?.mpesa_till)}
      />

      {/* Edit Document Modal */}
      <UploadPDFModal 
        open={editModalOpen} 
        onOpenChange={setEditModalOpen}
        onSuccess={fetchDocuments}
        hasPaymentMethod={!!(profile?.mpesa_paybill || profile?.mpesa_till)}
        editMode={true}
        documentData={editingDocument}
      />

      {/* QR Code Modal */}
      {selectedDocForQR && (
        <QRCodeModal
          open={qrModalOpen}
          onOpenChange={setQrModalOpen}
          documentId={selectedDocForQR.id}
          documentTitle={selectedDocForQR.title}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingDocument?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteDocument}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface NavButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const NavButton = ({ icon: Icon, label, active, onClick }: NavButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
};

export default Dashboard;
