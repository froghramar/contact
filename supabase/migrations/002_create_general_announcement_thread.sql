-- Create a general announcement thread
INSERT INTO announcement_threads (title)
VALUES ('General')
ON CONFLICT DO NOTHING;

