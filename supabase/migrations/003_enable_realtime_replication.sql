-- Enable replication for tables that need realtime subscriptions
-- This ensures realtime subscriptions work properly

DO $$
BEGIN
    -- Add messages table to replication (if not already added)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;

    -- Add reactions table to replication (if not already added)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'reactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
    END IF;

    -- Add threads table to replication (for admin dashboard updates)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'threads'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE threads;
    END IF;
END $$;

