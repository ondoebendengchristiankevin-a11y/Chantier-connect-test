ALTER TABLE sites
  ADD COLUMN cover_image_data bytea,
  ADD COLUMN cover_image_content_type text
    CHECK (
      cover_image_content_type IS NULL OR
      cover_image_content_type IN ('image/jpeg', 'image/png', 'image/webp')
    ),
  ADD CONSTRAINT sites_cover_image_pair_check
    CHECK ((cover_image_data IS NULL) = (cover_image_content_type IS NULL));
