-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table first (referenced by other tables)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create threads table (for chat threads)
CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  seen_at TIMESTAMP WITH TIME ZONE
);

-- Create reactions table
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create announcement_threads table
CREATE TABLE IF NOT EXISTS announcement_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES announcement_threads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_announcements_thread_id ON announcements(thread_id);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read profiles
CREATE POLICY "Anyone can view profiles"
  ON user_profiles FOR SELECT
  USING (true);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Function to sync user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_threads_updated_at BEFORE UPDATE ON threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcement_threads_updated_at BEFORE UPDATE ON announcement_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update thread updated_at when message is added
CREATE OR REPLACE FUNCTION update_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE threads SET updated_at = NOW() WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_thread_on_message_insert AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_thread_on_message();

-- Enable Row Level Security
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for threads
-- Users can see their own thread, admin can see all threads
CREATE POLICY "Users can view their own thread"
  ON threads FOR SELECT
  USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = 'froghramar@gmail.com');

CREATE POLICY "Users can create their own thread"
  ON threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for messages
-- Users can see messages in their thread, admin can see all messages
CREATE POLICY "Users can view messages in their thread"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM threads
      WHERE threads.id = messages.thread_id
      AND (threads.user_id = auth.uid() OR auth.jwt() ->> 'email' = 'froghramar@gmail.com')
    )
  );

CREATE POLICY "Users can send messages in their thread"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM threads
      WHERE threads.id = messages.thread_id
      AND (threads.user_id = auth.uid() OR auth.jwt() ->> 'email' = 'froghramar@gmail.com')
    )
    AND sender_id = auth.uid()
  );

CREATE POLICY "Users can update their messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid() OR auth.jwt() ->> 'email' = 'froghramar@gmail.com');

-- RLS Policies for reactions
CREATE POLICY "Users can view reactions"
  ON reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages
      JOIN threads ON threads.id = messages.thread_id
      WHERE messages.id = reactions.message_id
      AND (threads.user_id = auth.uid() OR auth.jwt() ->> 'email' = 'froghramar@gmail.com')
    )
  );

CREATE POLICY "Users can add reactions"
  ON reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages
      JOIN threads ON threads.id = messages.thread_id
      WHERE messages.id = reactions.message_id
      AND (threads.user_id = auth.uid() OR auth.jwt() ->> 'email' = 'froghramar@gmail.com')
    )
  );

CREATE POLICY "Users can delete their reactions"
  ON reactions FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for announcement_threads (public read, admin write)
CREATE POLICY "Anyone can view announcement threads"
  ON announcement_threads FOR SELECT
  USING (true);

CREATE POLICY "Only admin can create announcement threads"
  ON announcement_threads FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = 'froghramar@gmail.com');

CREATE POLICY "Only admin can update announcement threads"
  ON announcement_threads FOR UPDATE
  USING (auth.jwt() ->> 'email' = 'froghramar@gmail.com');

CREATE POLICY "Only admin can delete announcement threads"
  ON announcement_threads FOR DELETE
  USING (auth.jwt() ->> 'email' = 'froghramar@gmail.com');

-- RLS Policies for announcements (public read, admin write)
CREATE POLICY "Anyone can view announcements"
  ON announcements FOR SELECT
  USING (true);

CREATE POLICY "Only admin can create announcements"
  ON announcements FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = 'froghramar@gmail.com');

CREATE POLICY "Only admin can update announcements"
  ON announcements FOR UPDATE
  USING (auth.jwt() ->> 'email' = 'froghramar@gmail.com');

CREATE POLICY "Only admin can delete announcements"
  ON announcements FOR DELETE
  USING (auth.jwt() ->> 'email' = 'froghramar@gmail.com');

