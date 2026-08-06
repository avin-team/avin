-- The header uses one private inbox topic per participant. It carries only a
-- durable-message hint; clients fetch conversation data from the Avin API.
CREATE OR REPLACE FUNCTION private.can_receive_order_chat_realtime(topic text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_order_chat_participant(topic)
    OR EXISTS (
      SELECT 1
      FROM public."order" AS orders
      WHERE topic = 'inbox:' || (SELECT auth.jwt() ->> 'sub')
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

REVOKE ALL ON FUNCTION private.can_receive_order_chat_realtime(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_receive_order_chat_realtime(text) TO authenticated;

ALTER POLICY "Order participants can receive private chat realtime events"
ON realtime.messages
USING (
  extension IN ('broadcast', 'presence')
  AND private.can_receive_order_chat_realtime((SELECT realtime.topic()))
);

CREATE OR REPLACE FUNCTION private.broadcast_order_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  buyer_id text;
  seller_id text;
  event_payload jsonb := jsonb_build_object(
    'messageId', NEW.id,
    'orderId', NEW.order_id
  );
BEGIN
  SELECT orders.buyer_id, orders.seller_id
  INTO buyer_id, seller_id
  FROM public."order" AS orders
  WHERE orders.id = NEW.order_id;

  PERFORM realtime.send(
    event_payload,
    'new_message',
    'order:' || NEW.order_id::text,
    true
  );

  IF NEW.sender_id IS DISTINCT FROM buyer_id THEN
    PERFORM realtime.send(
      event_payload,
      'new_message',
      'inbox:' || buyer_id,
      true
    );
  END IF;

  IF NEW.sender_id IS DISTINCT FROM seller_id THEN
    PERFORM realtime.send(
      event_payload,
      'new_message',
      'inbox:' || seller_id,
      true
    );
  END IF;

  RETURN NEW;
END;
$$;
