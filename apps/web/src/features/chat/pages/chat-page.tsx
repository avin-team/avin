import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@avin/ui/components/avatar";
import { Badge } from "@avin/ui/components/badge";
import { Bubble, BubbleContent } from "@avin/ui/components/bubble";
import { Button } from "@avin/ui/components/button";
import { Input } from "@avin/ui/components/input";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from "@avin/ui/components/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@avin/ui/components/message-scroller";
import { cn } from "@avin/ui/lib/utils";
import {
  ArrowLeftIcon,
  ChatTeardropTextIcon,
  DotsThreeVerticalIcon,
  MagnifyingGlassIcon,
  NotePencilIcon,
  PaperclipIcon,
  PaperPlaneRightIcon,
  PhoneCallIcon,
  PlusIcon,
  VideoCameraIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import * as React from "react";

export interface ChatContact {
  avatarUrl?: string;
  badgeText?: string;
  id: string;
  isOnline?: boolean;
  lastMessage: string;
  name: string;
  orderCode?: string;
  role: string;
  timestamp: string;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "other" | "system";
  text: string;
  timestamp: string;
}

const MOCK_CONTACTS: ChatContact[] = [
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    badgeText: "Đơn mua",
    id: "c1",
    isOnline: true,
    lastMessage: "You: See you later, Alex!",
    name: "Alex John",
    orderCode: "#ORD-9BC54B",
    role: "Senior Backend Dev • Digital Store",
    timestamp: "9:23 AM",
    unreadCount: 0,
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    badgeText: "Đơn mua",
    id: "c2",
    isOnline: true,
    lastMessage: "Yeah, it's really well-explained. You should give it a try.",
    name: "Taylor Grande",
    orderCode: "#ORD-7812AC",
    role: "Seller • Tăng Tương Tác TikTok",
    timestamp: "8:45 AM",
    unreadCount: 2,
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    badgeText: "Đơn mua",
    id: "c3",
    isOnline: false,
    lastMessage: "You: Yep, see ya. 🖐️",
    name: "John Doe",
    orderCode: "#ORD-33219X",
    role: "Seller • Account Premium",
    timestamp: "Yesterday",
    unreadCount: 0,
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    badgeText: "Hỗ trợ",
    id: "c4",
    isOnline: true,
    lastMessage: "You: Sure ✌️",
    name: "Megan Flux",
    role: "Avin Marketplace Support",
    timestamp: "24 Aug, 2024",
    unreadCount: 0,
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    badgeText: "Đơn bán",
    id: "c5",
    isOnline: false,
    lastMessage: "You: Great, I'll review them now!",
    name: "David Brown",
    orderCode: "#ORD-55412M",
    role: "Buyer • SEO Optimization",
    timestamp: "22 Aug, 2024",
    unreadCount: 0,
  },
  {
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    badgeText: "Đơn mua",
    id: "c6",
    isOnline: true,
    lastMessage: "Same here! It's coming together nicely.",
    name: "Julia Carter",
    role: "UI/UX Designer",
    timestamp: "20 Aug, 2024",
    unreadCount: 0,
  },
];

const INITIAL_CONVERSATION: Record<string, ChatMessage[]> = {
  c1: [
    {
      id: "m1",
      sender: "other",
      text: "They've added a dark mode option! It looks really sleek.",
      timestamp: "9:23 AM",
    },
    {
      id: "m2",
      sender: "user",
      text: "Oh, nice! I've been waiting for that. I'll check it out later.",
      timestamp: "9:24 AM",
    },
    {
      id: "m3",
      sender: "other",
      text: "Yeah, let me know what you think.",
      timestamp: "9:25 AM",
    },
    {
      id: "m4",
      sender: "user",
      text: "For sure. Anyway, I should get back to reviewing the project.",
      timestamp: "9:26 AM",
    },
    {
      id: "m5",
      sender: "other",
      text: "Alright, talk to you later!",
      timestamp: "11:11 AM",
    },
    {
      id: "m6",
      sender: "user",
      text: "See you later, Alex!",
      timestamp: "11:15 AM",
    },
  ],
};

export const ChatPage = () => {
  // Desktop: which contact is selected in sidebar
  const [selectedContactId, setSelectedContactId] = React.useState("c1");
  // Mobile: null = show sidebar, non-null = show chat panel
  const [mobileContact, setMobileContact] = React.useState<ChatContact | null>(
    null
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [inputText, setInputText] = React.useState("");
  const [messagesMap, setMessagesMap] =
    React.useState<Record<string, ChatMessage[]>>(INITIAL_CONVERSATION);

  const selectedContact =
    MOCK_CONTACTS.find((c) => c.id === selectedContactId) ?? MOCK_CONTACTS[0];

  // On mobile, use the mobileContact; on desktop use selectedContact
  const activeContact = mobileContact ?? selectedContact;

  const currentMessages = messagesMap[activeContact.id] ?? [
    {
      id: "init",
      sender: "other" as const,
      text: `Hello! Welcome to the chat with ${activeContact.name}.`,
      timestamp: "Just now",
    },
  ];

  const filteredContacts = MOCK_CONTACTS.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      return;
    }

    const contactId = activeContact.id;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessagesMap((prev) => ({
      ...prev,
      [contactId]: [...(prev[contactId] ?? []), newMsg],
    }));
    setInputText("");

    setTimeout(() => {
      const replyMsg: ChatMessage = {
        id: `reply-${Date.now()}`,
        sender: "other",
        text: "Got it! Thanks for sending that over.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessagesMap((prev) => ({
        ...prev,
        [contactId]: [...(prev[contactId] ?? []), replyMsg],
      }));
    }, 1500);
  };

  const handleSelectContact = (contact: ChatContact) => {
    setSelectedContactId(contact.id);
    // on mobile this triggers chat view
    setMobileContact(contact);
  };

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const sidebar = (
    <div
      className={cn(
        // Mobile: full width, hidden when a contact is open
        "flex w-full flex-col gap-2 sm:w-56 lg:w-72 2xl:w-80",
        mobileContact ? "hidden sm:flex" : "flex"
      )}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 -mx-4 bg-background px-4 pb-3 shadow-sm sm:static sm:z-auto sm:mx-0 sm:p-0 sm:shadow-none">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Inbox</h1>
            <ChatTeardropTextIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <Button size="icon-xs" variant="ghost" aria-label="New Chat">
            <NotePencilIcon className="h-4 w-4 stroke-muted-foreground" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Contact list */}
      <div className="-mx-2 flex-1 overflow-y-auto">
        {filteredContacts.map((contact) => {
          const isSelected = contact.id === selectedContactId;
          return (
            <button
              key={contact.id}
              type="button"
              onClick={() => handleSelectContact(contact)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                isSelected
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50 text-foreground"
              )}
            >
              <div className="relative shrink-0">
                <Avatar size="default" className="size-9">
                  {contact.avatarUrl ? (
                    <AvatarImage src={contact.avatarUrl} alt={contact.name} />
                  ) : null}
                  <AvatarFallback className="text-xs font-medium">
                    {contact.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                {contact.isOnline && (
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold truncate">
                    {contact.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {contact.timestamp}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <p className="text-[11px] text-muted-foreground truncate">
                    {contact.lastMessage}
                  </p>
                  {contact.unreadCount ? (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                      {contact.unreadCount}
                    </span>
                  ) : null}
                </div>
                {contact.badgeText && (
                  <Badge
                    variant="outline"
                    className="mt-1 h-4 px-1.5 text-[9px] py-0"
                  >
                    {contact.badgeText}
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── Chat panel ────────────────────────────────────────────────────────────
  const chatPanel = (
    <div
      className={cn(
        // Mobile: full width, hidden when no contact selected
        "flex flex-1 flex-col",
        mobileContact ? "flex" : "hidden sm:flex"
      )}
    >
      {/* Chat header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Back button — mobile only */}
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Back"
            className="sm:hidden"
            onClick={() => setMobileContact(null)}
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>

          <Avatar size="default" className="size-9">
            {activeContact.avatarUrl ? (
              <AvatarImage
                src={activeContact.avatarUrl}
                alt={activeContact.name}
              />
            ) : null}
            <AvatarFallback className="text-xs font-medium">
              {activeContact.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">{activeContact.name}</h2>
              {activeContact.isOnline && (
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              )}
              {activeContact.badgeText && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                  {activeContact.badgeText}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeContact.role}
              {activeContact.orderCode && (
                <Link
                  to="/orders"
                  className="ml-2 text-primary hover:underline text-[11px]"
                >
                  {activeContact.orderCode}
                </Link>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button size="icon-xs" variant="ghost" aria-label="Video Call">
            <VideoCameraIcon className="h-4 w-4" />
          </Button>
          <Button size="icon-xs" variant="ghost" aria-label="Phone Call">
            <PhoneCallIcon className="h-4 w-4" />
          </Button>
          <Button size="icon-xs" variant="ghost" aria-label="More Options">
            <DotsThreeVerticalIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <MessageScrollerProvider>
        <MessageScroller className="flex-1 min-h-0">
          <MessageScrollerViewport className="px-4 py-4 sm:px-6">
            <MessageScrollerContent className="gap-1">
              <MessageScrollerItem className="flex justify-center py-2">
                <span className="rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">
                  24 Aug, 2024
                </span>
              </MessageScrollerItem>

              {currentMessages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <MessageScrollerItem key={msg.id}>
                    <Message align={isUser ? "end" : "start"}>
                      {!isUser && (
                        <MessageAvatar>
                          <Avatar size="sm" className="size-7">
                            {activeContact.avatarUrl ? (
                              <AvatarImage
                                src={activeContact.avatarUrl}
                                alt={activeContact.name}
                              />
                            ) : null}
                            <AvatarFallback className="text-[10px]">
                              {activeContact.name.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        </MessageAvatar>
                      )}
                      <MessageContent>
                        <Bubble
                          variant={isUser ? "default" : "secondary"}
                          align={isUser ? "end" : "start"}
                        >
                          <BubbleContent>{msg.text}</BubbleContent>
                        </Bubble>
                        <MessageFooter>{msg.timestamp}</MessageFooter>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                );
              })}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton direction="end" />
        </MessageScroller>
      </MessageScrollerProvider>

      {/* Input */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5"
        >
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label="Add"
            className="shrink-0"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label="Attach file"
            className="shrink-0"
          >
            <PaperclipIcon className="h-4 w-4" />
          </Button>
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="h-8 flex-1 border-none bg-transparent px-1 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            type="submit"
            size="icon-xs"
            variant="ghost"
            aria-label="Send"
            className="shrink-0 text-primary hover:bg-primary/10"
          >
            <PaperPlaneRightIcon className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 top-16 flex bg-background text-foreground">
      {/* Inner container — matches shadcn-admin's Main fixed pattern */}
      <div className="flex h-full w-full gap-0 overflow-hidden px-4 py-4 sm:gap-4 sm:px-6">
        {sidebar}

        {/* Vertical divider — desktop only */}
        <div className="hidden shrink-0 border-l border-border sm:block" />

        {chatPanel}
      </div>
    </div>
  );
};
