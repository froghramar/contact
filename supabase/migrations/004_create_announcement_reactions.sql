-- Create announcement_reactions table
CREATE TABLE IF NOT EXISTS announcement_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(announcement_id, user_id, emoji)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_announcement_reactions_announcement_id ON announcement_reactions(announcement_id);

-- Enable Row Level Security
ALTER TABLE announcement_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcement_reactions
-- Anyone can view reactions
CREATE POLICY "Anyone can view announcement reactions"
  ON announcement_reactions FOR SELECT
  USING (true);

-- Logged in users can add reactions
CREATE POLICY "Logged in users can add announcement reactions"
  ON announcement_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own announcement reactions"
  ON announcement_reactions FOR DELETE
  USING (user_id = auth.uid());

