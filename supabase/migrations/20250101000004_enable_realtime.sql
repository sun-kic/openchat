-- =============================================
-- ENABLE REALTIME FOR KEY TABLES
-- =============================================

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable realtime for rounds (so students see when rounds change)
ALTER PUBLICATION supabase_realtime ADD TABLE rounds;

-- Enable realtime for submissions (so teacher sees submissions in real-time)
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;

-- Optional: Enable for activities if you want real-time status updates
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
