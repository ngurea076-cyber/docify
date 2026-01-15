import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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

const Dashboard = () => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState("");
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDocuments();
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
            <NavItem icon={BarChart3} label="Dashboard" active />
            <NavItem icon={FileText} label="Documents" />
            <NavItem icon={BarChart3} label="Analytics" />
            <NavItem icon={DollarSign} label="Donations" />
            <NavItem icon={Settings} label="Settings" />
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
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
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
              <h1 className="text-xl font-semibold">Dashboard</h1>
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
                  {/* Thumbnail */}
                  <div className="w-12 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>

                  {/* Info */}
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

                  {/* Actions */}
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

            {/* Empty State */}
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

interface NavItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}

const NavItem = ({ icon: Icon, label, active }: NavItemProps) => {
  return (
    <button
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
