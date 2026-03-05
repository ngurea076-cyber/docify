import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo } from "react";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Eye,
  Download,
  MessageSquare,
  Star,
  CreditCard,
  TrendingUp,
  Calendar,
  FileText,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const DocumentStats = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const { data: document, isLoading: docLoading } = useQuery({
    queryKey: ["document-stats", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id!)
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: ratingStats } = useQuery({
    queryKey: ["document-rating-stats", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_document_rating_stats", {
        doc_id: id!,
      });
      if (error) throw error;
      return data?.[0] ?? { average_rating: 0, total_ratings: 0 };
    },
    enabled: !!id,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["document-comments-stats", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, content, guest_name, created_at, user_id")
        .eq("document_id", id!)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: commentsCount = 0 } = useQuery({
    queryKey: ["document-comments-count", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("document_id", id!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!id,
  });

  // Fetch daily view logs for chart
  const { data: viewLogs = [] } = useQuery({
    queryKey: ["document-view-logs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_views")
        .select("viewed_at")
        .eq("document_id", id!)
        .order("viewed_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Aggregate views by day for last 30 days
  const chartData = useMemo(() => {
    const now = new Date();
    const days: { date: string; views: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days.push({ date: key, views: 0 });
    }
    const map = new Map(days.map((d) => [d.date, d]));
    viewLogs.forEach((v) => {
      const key = new Date(v.viewed_at).toISOString().split("T")[0];
      const entry = map.get(key);
      if (entry) entry.views++;
    });
    return days.map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      views: d.views,
    }));
  }, [viewLogs]);

  if (authLoading || docLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16 container mx-auto px-4 text-center">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Document not found</h2>
          <p className="text-muted-foreground mb-6">
            This document doesn't exist or you don't have access.
          </p>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </main>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Views",
      value: document.view_count.toLocaleString(),
      icon: Eye,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Downloads",
      value: document.download_count.toLocaleString(),
      icon: Download,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      label: "Comments",
      value: commentsCount.toLocaleString(),
      icon: MessageSquare,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      label: "Avg Rating",
      value: ratingStats?.average_rating?.toString() ?? "0",
      icon: Star,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      subtitle: `${ratingStats?.total_ratings ?? 0} ratings`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Back & Title */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">{document.title}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Created {new Date(document.created_at).toLocaleDateString()}
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    document.is_public
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {document.is_public ? "Public" : "Private"}
                </span>
              </p>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat) => (
              <Card key={stat.label} className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}
                    >
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.subtitle}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Views Chart */}
          <Card className="border-border mb-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Views — Last 30 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "14px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="views"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Document Details */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">Document Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Type" value={document.document_type} />
                {document.description && (
                  <DetailRow label="Description" value={document.description} />
                )}
                {document.country && (
                  <DetailRow
                    label="Location"
                    value={[document.area, document.city, document.country]
                      .filter(Boolean)
                      .join(", ")}
                  />
                )}
                <DetailRow
                  label="Downloads allowed"
                  value={document.allow_downloads ? "Yes" : "No"}
                />
                <DetailRow
                  label="Comments allowed"
                  value={document.allow_comments ? "Yes" : "No"}
                />
                <DetailRow
                  label="Donations enabled"
                  value={document.allow_donations ? "Yes" : "No"}
                />
              </CardContent>
            </Card>

            {/* Recent Comments */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Recent Comments
                  <span className="text-sm font-normal text-muted-foreground">
                    {commentsCount} total
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No comments yet.
                  </p>
                ) : (
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="border-b border-border last:border-0 pb-3 last:pb-0"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            {comment.guest_name || "Registered User"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {comment.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Link to view */}
          <div className="text-center">
            <Button variant="outline" asChild>
              <Link to={`/d/${document.slug || document.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                View Document
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-start gap-4">
    <span className="text-sm text-muted-foreground shrink-0">{label}</span>
    <span className="text-sm font-medium text-right capitalize">{value}</span>
  </div>
);

export default DocumentStats;
