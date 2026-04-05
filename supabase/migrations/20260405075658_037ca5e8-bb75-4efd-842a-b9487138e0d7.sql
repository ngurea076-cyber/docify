
-- Support messages table for user-admin chat
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_admin_reply BOOLEAN NOT NULL DEFAULT false,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view their own messages"
ON public.support_messages
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Users can insert their own messages (not admin replies)
CREATE POLICY "Users can insert their own messages"
ON public.support_messages
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND is_admin_reply = false);

-- Admins can insert replies
CREATE POLICY "Admins can insert replies"
ON public.support_messages
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') AND is_admin_reply = true);

-- Admins can update messages (mark as read)
CREATE POLICY "Admins can update messages"
ON public.support_messages
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Users can update their own messages (mark admin replies as read)
CREATE POLICY "Users can mark messages as read"
ON public.support_messages
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- Add id_document_back_url to creator_payouts for back of ID
ALTER TABLE public.creator_payouts ADD COLUMN id_document_back_url TEXT;
