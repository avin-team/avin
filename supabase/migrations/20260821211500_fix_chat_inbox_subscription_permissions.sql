-- Fix inbox topic authorization so buyers and unbanned sellers can subscribe
-- to their personal inbox notification channels even if they have zero orders.
CREATE OR REPLACE FUNCTION private.can_receive_order_chat_realtime(topic text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_order_chat_participant(topic)
    OR topic = 'inbox:buyer:' || (SELECT auth.jwt() ->> 'sub')
    OR (
      topic = 'inbox:seller:' || (SELECT auth.jwt() ->> 'sub')
      AND EXISTS (
        SELECT 1
        FROM public."user" AS seller
        WHERE seller.id = (SELECT auth.jwt() ->> 'sub')
          AND seller.banned = false
      )
    );
$$;

REVOKE ALL ON FUNCTION private.can_receive_order_chat_realtime(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_receive_order_chat_realtime(text) TO authenticated;
