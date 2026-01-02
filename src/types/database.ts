export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  seen_at?: string;
  sender?: {
    email: string;
  };
}

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Thread {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
  };
  last_message?: Message;
  unread_count?: number;
}

export interface Announcement {
  id: string;
  thread_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementThread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  announcements?: Announcement[];
}

