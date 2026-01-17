-- ============================================
-- RECETAS DE CHARLY - Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, slug, icon) VALUES
  ('Desayunos', 'desayunos', '🍳'),
  ('Almuerzos', 'almuerzos', '🍝'),
  ('Cenas', 'cenas', '🍽️'),
  ('Postres', 'postres', '🍰'),
  ('Sopas', 'sopas', '🍲'),
  ('Ensaladas', 'ensaladas', '🥗'),
  ('Bebidas', 'bebidas', '🍹'),
  ('Snacks', 'snacks', '🍿'),
  ('Panaderia', 'panaderia', '🍞'),
  ('Mariscos', 'mariscos', '🦐');

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

-- ============================================
-- RECIPES
-- ============================================
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  source_url TEXT,
  cooking_time INTEGER,
  prep_time INTEGER,
  servings INTEGER DEFAULT 4,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_public BOOLEAN DEFAULT true,
  is_imported BOOLEAN DEFAULT false,
  imported_from TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, slug)
);

-- Full Text Search
ALTER TABLE recipes ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX recipes_fts_idx ON recipes USING gin(fts);
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_is_public ON recipes(is_public);
CREATE INDEX idx_recipes_created_at ON recipes(created_at DESC);

-- RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public recipes are viewable by everyone"
  ON recipes FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their own recipes"
  ON recipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recipes"
  ON recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes"
  ON recipes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes"
  ON recipes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- INGREDIENTS
-- ============================================
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ingredients are viewable by everyone"
  ON ingredients FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create ingredients"
  ON ingredients FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- RECIPE INGREDIENTS (junction)
-- ============================================
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  quantity DECIMAL,
  unit TEXT,
  notes TEXT,
  order_index INTEGER DEFAULT 0,

  UNIQUE(recipe_id, ingredient_id)
);

CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipe ingredients are viewable with recipe"
  ON recipe_ingredients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND (recipes.is_public = true OR recipes.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage ingredients of their recipes"
  ON recipe_ingredients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

-- ============================================
-- INSTRUCTIONS
-- ============================================
CREATE TABLE instructions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,

  UNIQUE(recipe_id, step_number)
);

ALTER TABLE instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructions are viewable with recipe"
  ON instructions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = instructions.recipe_id
      AND (recipes.is_public = true OR recipes.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage instructions of their recipes"
  ON instructions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = instructions.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

-- ============================================
-- TAGS
-- ============================================
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags are viewable by everyone"
  ON tags FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tags"
  ON tags FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- RECIPE TAGS (junction)
-- ============================================
CREATE TABLE recipe_tags (
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);

ALTER TABLE recipe_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipe tags are viewable with recipe"
  ON recipe_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_tags.recipe_id
      AND (recipes.is_public = true OR recipes.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage tags of their recipes"
  ON recipe_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_tags.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

-- ============================================
-- RECIPE CATEGORIES (junction)
-- ============================================
CREATE TABLE recipe_categories (
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, category_id)
);

ALTER TABLE recipe_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipe categories are viewable with recipe"
  ON recipe_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_categories.recipe_id
      AND (recipes.is_public = true OR recipes.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage categories of their recipes"
  ON recipe_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_categories.recipe_id
      AND recipes.user_id = auth.uid()
    )
  );

-- ============================================
-- BOOKMARKS
-- ============================================
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, recipe_id)
);

CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own bookmarks"
  ON bookmarks FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- LIKES
-- ============================================
CREATE TABLE likes (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, recipe_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone"
  ON likes FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own likes"
  ON likes FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- RECIPE NOTES
-- ============================================
CREATE TABLE recipe_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, recipe_id)
);

ALTER TABLE recipe_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes"
  ON recipe_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public notes"
  ON recipe_notes FOR SELECT
  USING (is_private = false);

CREATE POLICY "Users can manage their own notes"
  ON recipe_notes FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get recipe with all details
CREATE OR REPLACE FUNCTION get_recipe_with_details(recipe_slug TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'recipe', row_to_json(r),
    'profile', row_to_json(p),
    'ingredients', (
      SELECT json_agg(json_build_object(
        'id', ri.id,
        'quantity', ri.quantity,
        'unit', ri.unit,
        'notes', ri.notes,
        'ingredient', row_to_json(i)
      ) ORDER BY ri.order_index)
      FROM recipe_ingredients ri
      JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = r.id
    ),
    'instructions', (
      SELECT json_agg(row_to_json(ins) ORDER BY ins.step_number)
      FROM instructions ins
      WHERE ins.recipe_id = r.id
    ),
    'categories', (
      SELECT json_agg(row_to_json(c))
      FROM recipe_categories rc
      JOIN categories c ON c.id = rc.category_id
      WHERE rc.recipe_id = r.id
    ),
    'tags', (
      SELECT json_agg(row_to_json(t))
      FROM recipe_tags rt
      JOIN tags t ON t.id = rt.tag_id
      WHERE rt.recipe_id = r.id
    ),
    'likes_count', (SELECT COUNT(*) FROM likes WHERE recipe_id = r.id)
  ) INTO result
  FROM recipes r
  LEFT JOIN profiles p ON p.id = r.user_id
  WHERE r.slug = recipe_slug
  AND (r.is_public = true OR r.user_id = auth.uid());

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search recipes
CREATE OR REPLACE FUNCTION search_recipes(
  search_query TEXT DEFAULT NULL,
  category_slug TEXT DEFAULT NULL,
  difficulty_filter TEXT DEFAULT NULL,
  max_time INTEGER DEFAULT NULL,
  page_num INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 12
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  offset_val INTEGER;
BEGIN
  offset_val := (page_num - 1) * page_size;

  SELECT json_build_object(
    'recipes', (
      SELECT json_agg(row_to_json(sub))
      FROM (
        SELECT
          r.*,
          p.display_name as author_name,
          p.avatar_url as author_avatar,
          (SELECT COUNT(*) FROM likes WHERE recipe_id = r.id) as likes_count
        FROM recipes r
        LEFT JOIN profiles p ON p.id = r.user_id
        LEFT JOIN recipe_categories rc ON rc.recipe_id = r.id
        LEFT JOIN categories c ON c.id = rc.category_id
        WHERE r.is_public = true
        AND (search_query IS NULL OR r.fts @@ plainto_tsquery('spanish', search_query))
        AND (category_slug IS NULL OR c.slug = category_slug)
        AND (difficulty_filter IS NULL OR r.difficulty = difficulty_filter)
        AND (max_time IS NULL OR r.cooking_time <= max_time)
        ORDER BY r.created_at DESC
        LIMIT page_size
        OFFSET offset_val
      ) sub
    ),
    'total', (
      SELECT COUNT(DISTINCT r.id)
      FROM recipes r
      LEFT JOIN recipe_categories rc ON rc.recipe_id = r.id
      LEFT JOIN categories c ON c.id = rc.category_id
      WHERE r.is_public = true
      AND (search_query IS NULL OR r.fts @@ plainto_tsquery('spanish', search_query))
      AND (category_slug IS NULL OR c.slug = category_slug)
      AND (difficulty_filter IS NULL OR r.difficulty = difficulty_filter)
      AND (max_time IS NULL OR r.cooking_time <= max_time)
    ),
    'page', page_num,
    'page_size', page_size
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STORAGE BUCKET
-- ============================================
-- Run this separately in Storage settings or via API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('recipes', 'recipes', true);
