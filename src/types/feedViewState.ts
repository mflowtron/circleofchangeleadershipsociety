// Feed Item View State - tracks user interaction with each feed item

export interface FeedItemViewState {
  viewCount: number;           // times this card has been the active (visible) card
  lastViewedAt: number | null; // timestamp of last view
  interacted: boolean;         // user took the primary action (liked, voted, acknowledged, recorded)
  skippedAt: number | null;    // timestamp when user scrolled past without interacting (interstitials only)
  nudgeLevel: 0 | 1 | 2 | 3;   // 0 = first show, 1-2 = resurface with nudge, 3 = no more nudges
}

export const createInitialViewState = (): FeedItemViewState => ({
  viewCount: 0,
  lastViewedAt: null,
  interacted: false,
  skippedAt: null,
  nudgeLevel: 0,
});
