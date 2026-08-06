import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ChatPage } from "@/features/chat/pages/chat-page";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
  validateSearch: z.object({
    orderId: z.string().optional(),
  }),
});
