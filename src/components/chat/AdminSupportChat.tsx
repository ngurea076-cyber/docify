import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, MessageCircle, User } from "lucide-react";
import { format } from "date-fns";

interface ChatThread {
  user_id: string;
  username: string | null;
  email: string | null;
  unread_count: number;
  last_message: string;
  last_message_at: string;
}

interface Message {
  id: string;
  user_id: string;
  message: string;
  is_admin_reply: boolean;
  is_read: boolean;
  created_at: string;
}

const AdminSupportChat = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchMessages(selectedUserId);
      markAsRead(selectedUserId);
    }
  }, [selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-support")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
      }, (payload) => {
        const msg = payload.new as Message;
        if (msg.user_id === selectedUserId) {
          setMessages(prev => [...prev, msg]);
          if (!msg.is_admin_reply) markAsRead(msg.user_id);
        }
        fetchThreads();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedUserId]);

  const fetchThreads = async () => {
    const { data: allMessages } = await supabase
      .from("support_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (!allMessages) { setLoading(false); return; }

    const userMap = new Map<string, { messages: Message[] }>();
    allMessages.forEach(msg => {
      if (!userMap.has(msg.user_id)) userMap.set(msg.user_id, { messages: [] });
      userMap.get(msg.user_id)!.messages.push(msg);
    });

    const userIds = Array.from(userMap.keys());
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);

    const threadList: ChatThread[] = userIds.map(uid => {
      const msgs = userMap.get(uid)!.messages;
      const profile = profiles?.find(p => p.id === uid);
      return {
        user_id: uid,
        username: profile?.username || null,
        email: null,
        unread_count: msgs.filter(m => !m.is_admin_reply && !m.is_read).length,
        last_message: msgs[0].message,
        last_message_at: msgs[0].created_at,
      };
    });

    threadList.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
    setThreads(threadList);
    setLoading(false);
  };

  const fetchMessages = async (userId: string) => {
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const markAsRead = async (userId: string) => {
    await supabase
      .from("support_messages")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_admin_reply", false)
      .eq("is_read", false);
    fetchThreads();
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUserId || !user) return;
    setSending(true);
    await supabase.from("support_messages").insert({
      user_id: selectedUserId,
      message: newMessage.trim(),
      is_admin_reply: true,
    });
    setNewMessage("");
    setSending(false);
  };

  const totalUnread = threads.reduce((s, t) => s + t.unread_count, 0);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Support Messages
          {totalUnread > 0 && <Badge variant="destructive">{totalUnread}</Badge>}
        </CardTitle>
        <CardDescription>Respond to user messages</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex border border-border rounded-lg overflow-hidden h-[500px]">
          {/* Thread list */}
          <div className="w-1/3 border-r border-border overflow-y-auto">
            {threads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
            ) : threads.map(thread => (
              <button
                key={thread.user_id}
                onClick={() => setSelectedUserId(thread.user_id)}
                className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors ${
                  selectedUserId === thread.user_id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {thread.username || thread.user_id.slice(0, 8)}
                  </span>
                  {thread.unread_count > 0 && (
                    <Badge variant="destructive" className="text-[10px] h-5 min-w-5 flex items-center justify-center">
                      {thread.unread_count}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{thread.last_message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {format(new Date(thread.last_message_at), "MMM d, h:mm a")}
                </p>
              </button>
            ))}
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {!selectedUserId ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select a conversation
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.is_admin_reply ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                          msg.is_admin_reply
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                          <p className={`text-[10px] mt-1 ${msg.is_admin_reply ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {format(new Date(msg.created_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <div className="p-3 border-t border-border flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Reply..."
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                    className="flex-1"
                  />
                  <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminSupportChat;
