// Conference Feed Card Types

export interface BaseCard {
  id: string;
  cardType: "post" | "announcement" | "poll" | "videoask";
}

export interface PostCard extends BaseCard {
  cardType: "post";
  type: "video" | "photo" | "recap";
  user: string;
  handle: string;
  avatar: string;
  avatarBg: string;
  time: string;
  timeAgo: string;
  date: string;
  caption: string;
  tag: string;
  tagColor: string;
  playbackId?: string;
  imageUrl?: string;
  videoDuration?: string;
  likes: number;
  comments: number;
  shares: number;
  bookmarks: number;
  isRecap?: boolean;
  isPinned?: boolean;
  isOfficial?: boolean;
  liked: boolean;
  bookmarked: boolean;
}

export interface AnnouncementCard extends BaseCard {
  cardType: "announcement";
  title: string;
  body: string;
  emoji: string;
  accentColor: string;
  from: string;
  time: string;
  date: string;
  priority: "important" | "info";
  acknowledged: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  emoji: string;
  votes: number;
}

export interface PollCard extends BaseCard {
  cardType: "poll";
  question: string;
  options: PollOption[];
  totalVotes: number;
  accentColor: string;
  from: string;
  time: string;
  date: string;
  answered: boolean;
  selectedOption: string | null;
}

export interface VideoAskCard extends BaseCard {
  cardType: "videoask";
  prompt: string;
  subtitle: string;
  emoji: string;
  accentColor: string;
  from: string;
  time: string;
  date: string;
  responded: boolean;
  skippable: boolean;
}

export type FeedItem = PostCard | AnnouncementCard | PollCard | VideoAskCard;

// Type guards
export function isPostCard(item: FeedItem): item is PostCard {
  return item.cardType === "post";
}

export function isAnnouncementCard(item: FeedItem): item is AnnouncementCard {
  return item.cardType === "announcement";
}

export function isPollCard(item: FeedItem): item is PollCard {
  return item.cardType === "poll";
}

export function isVideoAskCard(item: FeedItem): item is VideoAskCard {
  return item.cardType === "videoask";
}

export function isBlockingCard(item: FeedItem): boolean {
  return item.cardType === "announcement" || item.cardType === "poll" || item.cardType === "videoask";
}

export function isResolved(item: FeedItem): boolean {
  if (isAnnouncementCard(item)) return item.acknowledged;
  if (isPollCard(item)) return item.answered;
  if (isVideoAskCard(item)) return item.responded;
  return true;
}

// Feed action types
export type FeedAction =
  | { type: "ACKNOWLEDGE_ANNOUNCEMENT"; id: string }
  | { type: "VOTE_POLL"; id: string; optionId: string }
  | { type: "RESPOND_VIDEOASK"; id: string }
  | { type: "SKIP_VIDEOASK"; id: string }
  | { type: "TOGGLE_LIKE"; id: string }
  | { type: "TOGGLE_BOOKMARK"; id: string };
