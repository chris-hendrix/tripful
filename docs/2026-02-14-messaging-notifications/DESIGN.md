---
date: 2026-02-14
topic: Tripful - Messaging & Notifications Design
last_updated: 2026-02-14
---

# Messaging & Notifications - Design System & Page Overview

## Design Philosophy

The messaging and notification system extends Tripful's Mediterranean (Vivid Capri) design language. Discussion feeds feel warm and conversational, like postcards exchanged between friends. Notifications are calm and informative, never intrusive. The system respects the existing visual hierarchy: itinerary content comes first, discussion complements it below.

### Core Principles

- **Contextual**: Discussion lives on the trip page, not a separate app
- **Non-Intrusive**: Notifications inform without overwhelming; unread counts are calm badges, not urgent alarms
- **Touch-Optimized**: All interactive elements meet 44px minimum touch targets on mobile
- **Accessible**: Proper ARIA labels, keyboard navigation, screen reader support

---

## Page Inventory

### 1. Trip Page - Discussion Section

**Purpose**: Message feed below the itinerary for trip communication

**Layout**:

```
┌─────────────────────────────────────┐
│ [Trip Header]                       │
│ [Itinerary Controls]                │
│ [Itinerary Content...]              │
│                                     │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                     │
│ Discussion (12 messages)            │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ 📌 Pinned Messages          │    │
│ │ ┌─────────────────────┐    │    │
│ │ │ [Pin] Mike: Don't   │    │    │
│ │ │ forget sunscreen!   │    │    │
│ │ └─────────────────────┘    │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ [Avatar] Write a message... │    │
│ │                      [Send] │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ [👤] Sarah · 2m ago   [⋮]  │    │
│ │ Who's bringing the cooler?  │    │
│ │                             │    │
│ │ [❤️2] [👍1] [😂] [😮]     │    │
│ │ [🎉] [✈️]                  │    │
│ │                             │    │
│ │ ┌── 💬 3 replies ─────┐   │    │
│ │ │ [👤] Mike · 1m ago  │   │    │
│ │ │ I'll grab one!      │   │    │
│ │ │                     │   │    │
│ │ │ [👤] Jane · 30s ago │   │    │
│ │ │ I have an extra     │   │    │
│ │ │                     │   │    │
│ │ │ [View 1 more reply] │   │    │
│ │ └─────────────────────┘   │    │
│ │                             │    │
│ │ [Reply]                     │    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ [👤] Mike · 5m ago    [⋮]  │    │
│ │ Just booked the restaurant! │    │
│ │ [❤️4] [🎉2]                │    │
│ │ [Reply]                     │    │
│ └─────────────────────────────┘    │
│                                     │
│ [Load more messages]                │
│                                     │
└─────────────────────────────────────┘
```

**Components**:

**Message Count Indicator** (at top of itinerary):

- Positioned in the trip meta area, below trip name/location/dates
- Format: "12 messages" as a clickable link with a speech bubble icon
- Shows preview: "Latest: Sarah - Who's bringing the cooler?" in `text-muted-foreground text-sm` truncated to one line
- Click scrolls smoothly to the discussion section
- Uses `scroll-into-view` with smooth behavior

**Discussion Section Header**:

- Separator line above (`border-t border-border`)
- Section title: "Discussion" in `text-2xl font-semibold font-[family-name:var(--font-playfair)]`
- Message count in `text-muted-foreground` next to title
- `id="discussion"` for scroll targeting

**Pinned Messages Banner**:

- `bg-primary/5 border border-primary/20 rounded-xl p-4`
- Pin icon in primary color
- Header: "Pinned" in `text-sm font-medium text-primary`
- Each pinned message shows author + content preview (truncated to 2 lines)
- Click expands to full message
- Only visible when there are pinned messages

**Message Input**:

- `bg-card rounded-xl border border-border p-4`
- Current user's avatar (32x32) on the left
- Textarea: auto-growing, placeholder "Write a message...", max 2000 chars
- Send button: `variant="gradient"` icon button (SendHorizonal icon)
- Character count shown when > 1800 characters
- Disabled state for muted members: grayed out with "You have been muted" text
- Disabled state for past trips: grayed out with "Trip has ended" text

**Message Card**:

- `bg-card rounded-xl border border-border p-4 hover:shadow-sm transition-shadow`
- **Header row**: Avatar (36x36) + Author name (`font-medium`) + Relative time (`text-sm text-muted-foreground`) + Actions menu (MoreHorizontal icon)
- **Content**: `text-base` with line breaks preserved, `whitespace-pre-wrap`
- **Edited indicator**: "(edited)" in `text-xs text-muted-foreground` after timestamp
- **Deleted placeholder**: `text-muted-foreground italic` "This message was deleted"
- **Pin indicator**: Small pin icon next to author name for pinned messages
- **Reactions bar**: Below content (see Reactions section)
- **Reply section**: Below reactions (see Replies section)
- **Reply button**: `text-sm text-muted-foreground hover:text-foreground` with MessageCircle icon

**Actions Menu** (DropdownMenu):

- For message author: "Edit", "Delete"
- For organizer (on any message): "Pin"/"Unpin", "Delete"
- For other members: No actions menu shown
- Past trips: Actions menu hidden

**Reactions Bar**:

```
┌──────────────────────────────────┐
│ [❤️ 2] [👍 1] [😂] [😮] [🎉] [✈️] │
└──────────────────────────────────┘
```

- 6 predefined emoji buttons in a horizontal row
- Each button: `rounded-full px-2.5 py-1 text-sm border`
- Default: `bg-muted/50 border-transparent hover:bg-muted`
- Active (user reacted): `bg-primary/10 border-primary/30 text-primary`
- Count displayed next to emoji when > 0
- Buttons without reactions: shown as smaller, muted icons
- Touch target: min 36px height
- Past trips: reactions disabled (buttons are decorative only)

**Replies Section**:

- Indented with left border: `ml-6 pl-4 border-l-2 border-border`
- Shows 2 most recent replies by default
- "View X more replies" button: `text-sm text-primary hover:underline`
- Expanded state shows all replies, oldest first
- Reply input appears below when "Reply" is clicked
- Reply input: smaller version of message input (no avatar, compact)

**Reply Card**:

- Compact version of message card
- Avatar (28x28) + Author name + Time + Content
- Reactions bar (same as message card, slightly smaller)
- No nested reply button (flat threading)

**Load More**:

- `text-center py-4`
- Button: `variant="outline"` "Load more messages"
- Loads next page of 20 top-level messages

**Design Details**:

- Spacing: `space-y-4` between message cards
- Animation: New messages fade in from top (`animate-in slide-in-from-top-2`)
- Optimistic updates: new messages appear instantly with slight opacity until confirmed
- Loading skeleton: 3 message-shaped skeletons with animated pulse
- Empty state: Centered illustration with "No messages yet. Start the conversation!" text

---

### 2. Trip Page - Message Count in Trip Meta

**Purpose**: Quick indicator of discussion activity, positioned near trip metadata

**Layout**:

```
┌─────────────────────────────────────┐
│ 📍 Miami Beach, FL                  │
│ 📅 Oct 12-14, 2026 · 11 events      │
│ 💬 12 messages                      │
│     Latest: Sarah - Who's bringi... │
└─────────────────────────────────────┘
```

**Design Details**:

- Speech bubble icon (`MessageCircle` from Lucide) + count text
- `text-sm text-muted-foreground hover:text-foreground cursor-pointer`
- Latest message preview: truncated with `truncate` class, one line
- Format: "Latest: [Author] - [Content preview]..."
- Click handler: `document.getElementById('discussion')?.scrollIntoView({ behavior: 'smooth' })`
- Only visible when trip has messages and user is a going member

---

### 3. Notification Bell - Global (App Header)

**Purpose**: Unread notification count and quick access across all pages

**Layout**:

```
┌─────────────────────────────────────┐
│ ✦ Tripful   Dashboard   [🔔3] [👤] │
└─────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ Notifications         [Mark all]│
│ ─────────────────────────────── │
│ 🔴 🔔 Bachelor Party           │
│    Dinner at Joe's starts in    │
│    1 hour · 45m ago             │
│ ─────────────────────────────── │
│ 🔴 💬 Ski Trip 2026             │
│    Mike: Just booked the cabin! │
│    · 2h ago                     │
│ ─────────────────────────────── │
│    📋 Bachelor Party            │
│    Today's itinerary: 5 events  │
│    · 8h ago                     │
│ ─────────────────────────────── │
│              ...                │
│                                 │
│ [View all notifications]        │
└─────────────────────────────────┘
```

**Components**:

**Bell Icon** (in app-header.tsx):

- `Bell` icon from Lucide (24x24)
- Badge: absolute positioned top-right
  - `bg-destructive text-destructive-foreground text-xs rounded-full min-w-[18px] h-[18px] px-1`
  - Shows count (max "9+")
  - Hidden when count is 0
- Container: `relative` button with `hover:bg-muted rounded-lg p-2`
- Polls unread count every 30 seconds

**Dropdown** (Popover):

- `w-[380px] max-h-[480px] overflow-y-auto`
- Header: "Notifications" title + "Mark all as read" text button
- Notification items listed vertically
- "View all notifications" link at bottom (links to per-trip notification dialog)
- Empty state: "No notifications yet" with bell icon

**Notification Item**:

- `px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors`
- Unread indicator: blue dot (`w-2 h-2 rounded-full bg-primary`) on the left
- Type icon: Bell for event reminder, Calendar for daily itinerary, MessageCircle for trip message
- Trip name: `text-sm font-medium`
- Body preview: `text-sm text-muted-foreground` truncated to 2 lines
- Timestamp: `text-xs text-muted-foreground` relative time
- Click: marks as read + navigates to content

---

### 4. Notification Bell - Per-Trip

**Purpose**: Trip-specific notifications and preference management

**Layout** (on trip page header):

```
┌─────────────────────────────────────┐
│ Bachelor Party Weekend  [🔔2] [✏️]  │
└─────────────────────────────────────┘
```

**Bell Button**:

- Same style as global bell but positioned next to the edit trip button
- Badge shows unread count for this trip only
- Click opens the Notification Dialog

---

### 5. Notification Dialog (Per-Trip)

**Purpose**: View trip notifications and manage preferences

**Layout**:

```
┌─────────────────────────────────────┐
│ Notifications          [×]          │
│ [Notifications] [Preferences]       │
├─────────────────────────────────────┤
│                                     │
│ Notifications Tab:                  │
│ ┌─────────────────────────────┐    │
│ │ 🔴 🔔 Dinner at Joe's       │    │
│ │    starts in 1 hour          │    │
│ │    · 45 minutes ago          │    │
│ ├─────────────────────────────┤    │
│ │ 🔴 💬 Mike posted a message  │    │
│ │    Just booked the cabin!    │    │
│ │    · 2 hours ago             │    │
│ ├─────────────────────────────┤    │
│ │    📋 Today's itinerary      │    │
│ │    5 events planned          │    │
│ │    · 8 hours ago             │    │
│ └─────────────────────────────┘    │
│                                     │
│ [Load more]                         │
│                                     │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                     │
│ Preferences Tab:                    │
│ ┌─────────────────────────────┐    │
│ │ Event Reminders        [ON] │    │
│ │ Get notified 1 hour before  │    │
│ │ each event                  │    │
│ ├─────────────────────────────┤    │
│ │ Daily Itinerary        [ON] │    │
│ │ Receive a summary of the    │    │
│ │ day's events at 8am         │    │
│ ├─────────────────────────────┤    │
│ │ Trip Messages          [ON] │    │
│ │ Get notified when someone   │    │
│ │ posts a new message         │    │
│ └─────────────────────────────┘    │
│                                     │
│ Notifications are sent in-app       │
│ and via SMS to your phone number.   │
│                                     │
└─────────────────────────────────────┘
```

**Components**:

**Dialog** (using existing Dialog component):

- `max-w-lg`
- Title: "Notifications"
- Tabs: shadcn/ui `Tabs` component with "Notifications" and "Preferences" tabs

**Notifications Tab**:

- Same notification item design as global dropdown
- Paginated (20 per page) with "Load more" button
- "Mark all as read" button in tab header
- Click navigates to content and closes dialog

**Preferences Tab**:

- Three toggle rows using shadcn/ui `Switch` component
- Each row:
  - `flex items-center justify-between py-4`
  - Left: Label (`font-medium`) + Description (`text-sm text-muted-foreground`)
  - Right: `Switch` toggle
- Changes saved immediately on toggle (debounced mutation)
- Footer note: `text-xs text-muted-foreground` explaining SMS delivery
- Success toast on save: "Preferences updated"

---

### 6. Members Dialog - Mute Option

**Purpose**: Organizer moderation controls for muting members

**Layout** (extension of existing Members dialog):

```
┌─────────────────────────────────────┐
│ Members (8)              [×]        │
│ [Invite Members]                    │
├─────────────────────────────────────┤
│                                     │
│ [👤] Mike Johnson     Organizer     │
│                                     │
│ [👤] Sarah Smith      Going    [⋮] │
│                          │          │
│                  ┌───────┴───────┐  │
│                  │ Mute          │  │
│                  │ Remove        │  │
│                  └───────────────┘  │
│                                     │
│ [👤] Jane Doe  🔇 Muted  Going [⋮] │
│                          │          │
│                  ┌───────┴───────┐  │
│                  │ Unmute        │  │
│                  │ Remove        │  │
│                  └───────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

**Additions to Existing Members Dialog**:

- **Mute badge**: `🔇 Muted` badge next to RSVP status for muted members
  - `bg-muted text-muted-foreground text-xs rounded-full px-2 py-0.5`
- **Action menu**: Add "Mute" option above "Remove" for non-muted going members
- **Unmute option**: Replace "Mute" with "Unmute" for muted members
- Mute/unmute only available to organizers
- Cannot mute other organizers or the trip creator

---

## Responsive Breakpoints

### Mobile (< 640px):

- Message cards: full width, slightly reduced padding (p-3)
- Reactions bar: wraps to second line if needed
- Reply section: `ml-4 pl-3` (reduced indent)
- Notification dropdown: full-width sheet from bottom
- Notification dialog: full-screen on mobile
- Message input: fixed at bottom of discussion section

### Tablet (640px - 1024px):

- Message cards: full width with standard padding
- Notification dropdown: standard popover width (380px)
- Discussion section: max-width constrained

### Desktop (> 1024px):

- Message cards: full width within content area
- Hover states on reactions and message cards
- Keyboard shortcuts: Enter to send (Shift+Enter for newline)

---

## Animation Patterns

### Message Entry:

```css
/* New messages fade in from top */
@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
/* Duration: 300ms ease-out */
```

### Reaction Toggle:

```css
/* Scale pop on reaction add */
@keyframes reactionPop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
}
/* Duration: 200ms ease-in-out */
```

### Notification Badge:

```css
/* Pulse on new notification */
@keyframes badgePulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}
/* Duration: 600ms, plays once on count change */
```

### Unread Indicator:

- Blue dot fades in with 200ms opacity transition
- Fades out on read with 300ms transition

---

## Accessibility

### Discussion Section:

- `<section aria-label="Trip discussion">`
- Message list: `role="feed"` with `aria-busy` during loading
- Each message: `<article>` with `aria-label="Message from [Author]"`
- Reactions: `role="group" aria-label="Reactions"`, each button has `aria-pressed` state
- Reply section: `aria-expanded` on the expand button
- Message input: `aria-label="Write a message"`, `aria-describedby` for character count

### Notifications:

- Bell button: `aria-label="Notifications, X unread"`
- Dropdown: `role="menu"` with keyboard navigation
- Each item: `role="menuitem"` with `aria-label` describing the notification
- Unread indicator: `aria-hidden="true"` (visual-only, screen reader gets "unread" in label)

### Keyboard Navigation:

- Tab through messages, reactions, reply buttons
- Enter/Space on reaction buttons to toggle
- Escape to close dropdowns and dialogs
- Arrow keys to navigate notification list

---

## Component Patterns

### Message Card:

```tsx
<article className="bg-card rounded-xl border border-border p-4 hover:shadow-sm transition-shadow">
  <div className="flex items-start gap-3">
    <Avatar className="h-9 w-9" />
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{author.displayName}</span>
          <span className="text-xs text-muted-foreground">{relativeTime}</span>
          {message.editedAt && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
        </div>
        <ActionsMenu />
      </div>
      <p className="mt-1 text-sm whitespace-pre-wrap">{message.content}</p>
      <ReactionsBar reactions={message.reactions} />
      <RepliesSection replies={message.replies} />
    </div>
  </div>
</article>
```

### Reaction Button:

```tsx
<button
  className={cn(
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm border transition-colors",
    isActive
      ? "bg-primary/10 border-primary/30 text-primary"
      : "bg-muted/50 border-transparent hover:bg-muted text-muted-foreground",
  )}
  aria-pressed={isActive}
>
  <span>{REACTION_EMOJI_MAP[emoji]}</span>
  {count > 0 && <span className="text-xs font-medium">{count}</span>}
</button>
```

### Notification Badge:

```tsx
<div className="relative">
  <Bell className="h-5 w-5" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-medium">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  )}
</div>
```

### Preference Toggle:

```tsx
<div className="flex items-center justify-between py-4">
  <div>
    <Label className="font-medium">{label}</Label>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
  <Switch checked={value} onCheckedChange={onChange} />
</div>
```

---

## Design Tokens

All new colors use the existing Vivid Capri palette. No new design tokens are needed.

### Usage in Messaging:

```
Message cards:           bg-card border-border
Pinned banner:           bg-primary/5 border-primary/20
Active reaction:         bg-primary/10 border-primary/30 text-primary
Inactive reaction:       bg-muted/50 border-transparent
Reply indent:            border-l-2 border-border
Muted badge:             bg-muted text-muted-foreground
Unread dot:              bg-primary
Notification badge:      bg-destructive text-destructive-foreground
Deleted placeholder:     text-muted-foreground italic
```

---

## File References

- Discussion components: `apps/web/src/components/messaging/`
- Notification components: `apps/web/src/components/notifications/`
- App header (bell): `apps/web/src/components/app-header.tsx`
- Members dialog (mute): `apps/web/src/components/trip/members-dialog.tsx`
- TanStack Query hooks: `apps/web/src/hooks/use-messages.ts`, `use-notifications.ts`
- Design tokens: `apps/web/src/app/globals.css`
- PRD: `docs/2026-02-14-messaging-notifications/PRD.md`
- Architecture: `docs/2026-02-14-messaging-notifications/ARCHITECTURE.md`
