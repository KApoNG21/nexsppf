CREATE TABLE IF NOT EXISTS stock_color_products (
  id serial PRIMARY KEY,
  sku_code text NOT NULL UNIQUE,
  series_name text NOT NULL,
  product_name text NOT NULL,
  color_name text NOT NULL,
  color_code text NOT NULL DEFAULT '',
  color_hex text NOT NULL,
  size_label text NOT NULL,
  metres numeric(10, 3) NOT NULL CHECK (metres > 0 AND metres <= 10000),
  image_object_key text,
  image_original_name text,
  image_content_type text,
  image_size_bytes integer,
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS stock_color_products_name_idx
  ON stock_color_products (lower(color_name), lower(series_name));

CREATE INDEX IF NOT EXISTS stock_color_products_updated_at_idx
  ON stock_color_products (updated_at DESC);
