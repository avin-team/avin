-- Better Auth identities are represented to Supabase Realtime by short-lived
-- ES256 JWTs. The browser never receives access to Avin's business tables.
CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_order_chat_participant(topic text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."order" AS orders
    WHERE topic = 'order:' || orders.id::text
      AND (
        orders.buyer_id = (SELECT auth.uid())::text
        OR (
          orders.seller_id = (SELECT auth.uid())::text
          AND EXISTS (
            SELECT 1
            FROM public."user" AS seller
            WHERE seller.id = orders.seller_id
              AND seller.banned = false
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION private.is_order_chat_participant(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_order_chat_participant(text) TO authenticated;

CREATE POLICY "Order participants can receive private chat realtime events"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension IN ('broadcast', 'presence')
  AND private.is_order_chat_participant((SELECT realtime.topic()))
);

CREATE POLICY "Order participants can send private chat transient events"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  extension IN ('broadcast', 'presence')
  AND private.is_order_chat_participant((SELECT realtime.topic()))
);

CREATE OR REPLACE FUNCTION private.broadcast_order_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object('messageId', NEW.id),
    'new_message',
    'order:' || NEW.order_id::text,
    true
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.broadcast_order_message_insert() FROM PUBLIC;

CREATE CONSTRAINT TRIGGER order_message_broadcast_after_insert
AFTER INSERT ON public.order_message
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION private.broadcast_order_message_insert();
