import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Loader2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import HCaptcha from "@hcaptcha/react-hcaptcha";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string | null;
  guest_name: string | null;
  profiles: {
    username: string | null;
  } | null;
}

interface CommentsSectionProps {
  documentId: string;
  allowComments: boolean;
  embedded?: boolean;
  pageSize?: number;
}

const HCAPTCHA_SITE_KEY = "10000000-ffff-ffff-ffff-000000000001"; // Test key - replace with real key

const CommentsSection = ({ 
  documentId, 
  allowComments, 
  embedded = false,
  pageSize = 5 
}: CommentsSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [guestName, setGuestName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  const totalPages = Math.ceil(allComments.length / pageSize);

  useEffect(() => {
    if ((open || embedded) && allowComments) {
      fetchComments();
      
      // Subscribe to realtime changes
      const channel = supabase
        .channel(`comments-${documentId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comments',
            filter: `document_id=eq.${documentId}`,
          },
          () => {
            fetchComments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, embedded, documentId, allowComments]);

  // Update visible comments when page changes or all comments update
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setComments(allComments.slice(startIndex, endIndex));
  }, [currentPage, allComments, pageSize]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id,
          content,
          created_at,
          user_id,
          guest_name,
          profiles:user_id (
            username
          )
        `)
        .eq("document_id", documentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;

    // For logged-in users, use regular Supabase insert
    if (user) {
      setSubmitting(true);
      try {
        // Ensure profile exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!existingProfile) {
          await supabase.from("profiles").insert({ id: user.id });
        }

        const { error } = await supabase.from("comments").insert({
          document_id: documentId,
          user_id: user.id,
          content: newComment.trim(),
        });

        if (error) throw error;

        setNewComment("");
        toast({
          title: "Comment posted",
          description: "Your comment has been added",
        });
        fetchComments();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to post comment",
          variant: "destructive",
        });
      } finally {
        setSubmitting(false);
      }
    } else {
      // For guests, require CAPTCHA verification
      if (!captchaToken) {
        toast({
          title: "Verification required",
          description: "Please complete the CAPTCHA verification",
          variant: "destructive",
        });
        return;
      }

      setSubmitting(true);
      try {
        const { data, error } = await supabase.functions.invoke("verify-captcha-comment", {
          body: {
            captchaToken,
            documentId,
            content: newComment.trim(),
            guestName: guestName.trim() || "Guest",
          },
        });

        if (error) throw error;

        if (data?.error) {
          throw new Error(data.error);
        }

        setNewComment("");
        setGuestName("");
        setCaptchaToken(null);
        captchaRef.current?.resetCaptcha();
        
        toast({
          title: "Comment posted",
          description: "Your comment has been added",
        });
        fetchComments();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to post comment",
          variant: "destructive",
        });
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast({
        title: "Comment deleted",
        description: "Your comment has been removed",
      });
      fetchComments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getUserInitials = (comment: Comment) => {
    if (comment.profiles?.username) {
      return comment.profiles.username.slice(0, 2).toUpperCase();
    }
    if (comment.guest_name) {
      return comment.guest_name.slice(0, 2).toUpperCase();
    }
    return "GU";
  };

  const getDisplayName = (comment: Comment) => {
    if (comment.profiles?.username) {
      return comment.profiles.username;
    }
    return comment.guest_name || "Guest";
  };

  if (!allowComments) return null;

  // Pagination controls component
  const PaginationControls = () => (
    totalPages > 1 ? (
      <div className="flex items-center justify-center gap-2 pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentPage} of {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    ) : null
  );

  // Comment input form - now supports both logged in users and guests
  const CommentInput = () => (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!user && (
        <Input
          placeholder="Your name (optional)"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          maxLength={50}
        />
      )}
      <Textarea
        placeholder="Write a comment..."
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        className="resize-none"
        rows={3}
      />
      {!user && (
        <div className="flex justify-center">
          <HCaptcha
            ref={captchaRef}
            sitekey={HCAPTCHA_SITE_KEY}
            onVerify={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken(null)}
          />
        </div>
      )}
      <Button 
        type="submit" 
        disabled={!newComment.trim() || submitting || (!user && !captchaToken)}
        className="w-full"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Posting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Post Comment
          </>
        )}
      </Button>
      {!user && (
        <p className="text-xs text-center text-muted-foreground">
          Complete the verification above to post as a guest
        </p>
      )}
    </form>
  );

  // Comments list
  const CommentsList = ({ scrollable = true }: { scrollable?: boolean }) => {
    const content = loading ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ) : comments.length === 0 ? (
      <div className="text-center py-8">
        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">No comments yet</p>
        <p className="text-sm text-muted-foreground/70">Be the first to comment!</p>
      </div>
    ) : (
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-primary">
                  {getUserInitials(comment)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {getDisplayName(comment)}
                    </span>
                    {!comment.user_id && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        Guest
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm mt-1 text-foreground/90 break-words">
                  {comment.content}
                </p>
              </div>
              {user?.id === comment.user_id && comment.user_id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(comment.id)}
                  disabled={deletingId === comment.id}
                >
                  {deletingId === comment.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
        <PaginationControls />
      </div>
    );

    if (scrollable) {
      return <ScrollArea className="flex-1">{content}</ScrollArea>;
    }
    return content;
  };

  // Embedded mode - render directly without sheet
  if (embedded) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-semibold">
            Comments ({allComments.length})
          </h3>
        </div>
        
        <div className="space-y-4">
          <CommentInput />
          <CommentsList scrollable={false} />
        </div>
      </div>
    );
  }

  // Sheet mode - render as slide-out panel
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4 max-w-md cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Comments</h3>
            <p className="text-xs text-muted-foreground">
              {allComments.length > 0 ? `${allComments.length} comments` : "Join the conversation"}
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0">
            View
          </Button>
        </div>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments ({allComments.length})
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 flex flex-col gap-4 mt-4 overflow-hidden">
          <CommentInput />
          <CommentsList scrollable={true} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CommentsSection;