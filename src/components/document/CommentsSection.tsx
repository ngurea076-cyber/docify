import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Loader2, Trash2, LogIn, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to leave a comment",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) return;

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

  const getUserInitials = (username: string | null) => {
    if (username) {
      return username.slice(0, 2).toUpperCase();
    }
    return "AN";
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

  // Comment input form
  const CommentInput = () => (
    user ? (
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="resize-none"
          rows={3}
        />
        <Button 
          type="submit" 
          disabled={!newComment.trim() || submitting}
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
      </form>
    ) : (
      <div className="bg-muted/50 rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Sign in to leave a comment
        </p>
        <Link to="/login">
          <Button variant="outline" size="sm" className="gap-2">
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        </Link>
      </div>
    )
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
                  {getUserInitials(comment.profiles?.username)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    {comment.profiles?.username || "Anonymous"}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm mt-1 text-foreground/90 break-words">
                  {comment.content}
                </p>
              </div>
              {user?.id === comment.user_id && (
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
