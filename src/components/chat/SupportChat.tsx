import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Message {
  id: string;
  message: string;
  is_admin_reply: boolean;
  is_read: boolean;
  created_at: string;
}

const SupportChat = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) fetchMessages();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("support-chat")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        if ((payload.new as Message).is_admin_reply && !open) {
          setUnreadCount(c => c + 1);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open && user) {
      markAsRead();
      setUnreadCount(0);
    }
  }, [open]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true });
    if (data) {
      setMessages(data);
      setUnreadCount(data.filter(m => m.is_admin_reply && !m.is_read).length);
    }
  };

  const markAsRead = async () => {
    await supabase
      .from("support_messages")
      .update({ is_read: true })
      .eq("user_id", user!.id)
      .eq("is_admin_reply", true)
      .eq("is_read", false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from("support_messages").insert({
      user_id: user.id,
      message: newMessage.trim(),
      is_admin_reply: false,
    });
    if (!error) setNewMessage("");
    setSending(false);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:-translate-y-0.5"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {unreadCount > 0 && !open && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 h-[28rem] bg-card border border-border rounded-xl shadow-2xl flex flex-col animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border bg-primary/5">
            <h3 className="font-semibold text-foreground">Support Chat</h3>
            <p className="text-xs text-muted-foreground">We usually reply within 24 hours</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Send a message to get help from our team
              </p>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.is_admin_reply ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                  msg.is_admin_reply
                    ? "bg-muted text-foreground"
                    : "bg-primary text-primary-foreground"
                }`}>
                  {msg.is_admin_reply && (
                    <p className="text-[10px] font-semibold mb-0.5 opacity-70">Admin</p>
                  )}
                  <p className="whitespace-pre-wrap">{msg.message}</p>
                  <p className={`text-[10px] mt-1 ${msg.is_admin_reply ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                    {format(new Date(msg.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border flex gap-2">
            <Input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              className="flex-1"
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportChat;
