-- Better Auth user IDs are opaque strings, whereas auth.uid() casts JWT sub to
-- uuid. Read the subject claim directly so Realtime can authorize participants.
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
        orders.buyer_id = (SELECT auth.jwt() ->> 'sub')
        OR (
          orders.seller_id = (SELECT auth.jwt() ->> 'sub')
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
