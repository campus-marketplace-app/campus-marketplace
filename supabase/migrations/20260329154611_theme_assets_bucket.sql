-- Storage bucket for school theme assets (logos, background images).
-- Public read access so the frontend can load them directly.

INSERT INTO storage.buckets (id, name, public)
VALUES ('theme-assets', 'theme-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view theme assets
CREATE POLICY "Theme assets are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'theme-assets');
