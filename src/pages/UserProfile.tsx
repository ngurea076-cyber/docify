import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ExploreDocumentCard from "@/components/explore/ExploreDocumentCard";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Link2, Check, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileData {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
}

interface Document {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  slug: string | null;
  view_count: number;
  download_count: number;
  country: string | null;
  city: string | null;
  document_type: string;
  thumbnail_url: string | null;
}

const UserProfile = () => {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (username) fetchProfileAndDocs();
  }, [username]);

  const fetchProfileAndDocs = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, bio, avatar_url")
        .eq("username", username)
        .single();

      if (profileError || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: docs } = await supabase
        .from("documents")
        .select("id, title, description, file_url, slug, view_count, download_count, country, city, document_type, thumbnail_url")
        .eq("user_id", profileData.id)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      setDocuments(docs || []);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/u/${username}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Link copied!", description: "Profile link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-12 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">User not found</h1>
          <p className="text-muted-foreground mb-6">The profile you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/explore">Browse Documents</Link>
          </Button>
        </main>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile?.id;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center mb-12">
          <Avatar className="h-24 w-24 mb-4">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.username || "User"} />
            ) : null}
            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
              {getInitials(profile?.username)}
            </AvatarFallback>
          </Avatar>

          <h1 className="text-3xl font-bold text-foreground mb-1">
            {profile?.username || "Anonymous"}
          </h1>

          {profile?.bio && (
            <p className="text-muted-foreground max-w-md mb-4">{profile.bio}</p>
          )}

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleShareProfile}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Share2 className="h-4 w-4 mr-1" />}
              {copied ? "Copied!" : "Share Profile"}
            </Button>
            {isOwnProfile && (
              <Button variant="secondary" size="sm" asChild>
                <Link to="/profile">Edit Profile</Link>
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            <FileText className="h-4 w-4 inline mr-1" />
            {documents.length} public document{documents.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Documents Grid */}
        {documents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {documents.map((doc) => (
              <ExploreDocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No public documents yet</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default UserProfile;
