import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DollarSign,
  User,
  CreditCard,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UploadPDFModal from "@/components/upload/UploadPDFModal";

interface Document {
  id: string;
  title: string;
  view_count: number;
  download_count: number;
  is_public: boolean;
  created_at: string;
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
  
  // Profile form states
  const [username, setUsername] = useState("");
  const [paybill, setPaybill] = useState("");
  const [tillNumber, setTillNumber] = useState("");
  
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
      .select("id, title, view_count, download_count, is_public, created_at")
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const stats = [
    { label: "Total Views", value: "12,847", change: "+23%", icon: Eye },
    { label: "Downloads", value: "3,291", change: "+12%", icon: Download },
    { label: "QR Scans", value: "856", change: "+45%", icon: QrCode },
    { label: "Donations", value: "$234", change: "+8%", icon: DollarSign },
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
              icon={DollarSign} 
              label="Donations" 
              active={activeSection === "donations"} 
              onClick={() => setActiveSection("donations")}
            />
            <NavButton 
              icon={User} 
              label="Profile" 
              active={activeSection === "profile"} 
              onClick={() => setActiveSection("profile")}
            />
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
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
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
                      <span className="text-sm text-accent font-medium">{stat.change}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Documents Section */}
              <div className="bg-card rounded-xl border border-border shadow-sm">
                <div className="p-5 border-b border-border">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                </div>

                {/* Documents List */}
                <div className="divide-y divide-border">
                  {documents.map((doc) => (
                    <Link
                      to={`/d/${doc.id}`}
                      key={doc.id}
                      className="flex items-center gap-4 p-5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-12 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{doc.title}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              doc.is_public
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {doc.is_public ? "public" : "private"}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            {doc.view_count.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="h-3.5 w-3.5" />
                            {doc.download_count}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.preventDefault()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </Link>
                  ))}
                </div>

                {documents.length === 0 && (
                  <div className="p-12 text-center">
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
            <div className="bg-card rounded-xl border border-border shadow-sm">
              <div className="p-5 border-b border-border">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
              </div>

              <div className="divide-y divide-border">
                {documents.map((doc) => (
                  <Link
                    to={`/d/${doc.id}`}
                    key={doc.id}
                    className="flex items-center gap-4 p-5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-12 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{doc.title}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            doc.is_public
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {doc.is_public ? "public" : "private"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {doc.view_count.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3.5 w-3.5" />
                          {doc.download_count}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.preventDefault()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Link2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>

              {documents.length === 0 && (
                <div className="p-12 text-center">
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
                <DollarSign className="h-8 w-8 text-muted-foreground" />
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
              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="payment" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <Card>
                    <CardHeader>
                      <CardTitle>Profile Information</CardTitle>
                      <CardDescription>
                        Update your profile details visible to others
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
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
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payment">
                  <Card>
                    <CardHeader>
                      <CardTitle>M-Pesa Payment Settings</CardTitle>
                      <CardDescription>
                        Configure your M-Pesa details to receive donations from viewers
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="p-4 bg-accent/20 rounded-lg border border-accent/30">
                        <p className="text-sm text-muted-foreground">
                          <strong>Note:</strong> You can set up either a Paybill number or a Till number. 
                          Donors will see these details when they choose to support your content.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="paybill">Paybill Number</Label>
                        <Input
                          id="paybill"
                          type="text"
                          placeholder="e.g., 123456"
                          value={paybill}
                          onChange={(e) => setPaybill(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter your M-Pesa Paybill number for business payments
                        </p>
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">or</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="till">Till Number</Label>
                        <Input
                          id="till"
                          type="text"
                          placeholder="e.g., 7654321"
                          value={tillNumber}
                          onChange={(e) => setTillNumber(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter your M-Pesa Till number for Buy Goods payments
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
                          "Save Payment Settings"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </main>

      <UploadPDFModal 
        open={uploadModalOpen} 
        onOpenChange={setUploadModalOpen}
        onSuccess={fetchDocuments}
      />
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
