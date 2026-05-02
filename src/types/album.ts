export interface AlbumPhoto {
  id: string;
  uploaded_by: string;
  /** Short-lived signed URL (private bucket). Refreshed on demand. */
  image_url: string;
  storage_path: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  file_size: number | null;
  created_at: string;
  uploader: {
    full_name: string;
    avatar_url: string | null;
  };
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
}

export interface AlbumComment {
  id: string;
  photo_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: {
    full_name: string;
    avatar_url: string | null;
  };
}

export type AlbumFilter = 'all' | 'mine' | 'top';
