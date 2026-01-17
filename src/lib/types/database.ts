export interface Profile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  created_at: string
}

export interface Recipe {
  id: string
  user_id: string
  title: string
  slug: string
  description: string | null
  image_url: string | null
  source_url: string | null
  cooking_time: number | null
  prep_time: number | null
  servings: number
  difficulty: 'easy' | 'medium' | 'hard' | null
  is_public: boolean
  is_imported: boolean
  imported_from: string | null
  created_at: string
  updated_at: string
}

export interface RecipeWithDetails extends Recipe {
  profile?: Profile
  ingredients?: RecipeIngredient[]
  instructions?: Instruction[]
  categories?: Category[]
  tags?: Tag[]
  likes_count?: number
  is_bookmarked?: boolean
  is_liked?: boolean
}

export interface Ingredient {
  id: string
  name: string
  category: string | null
  created_at: string
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  ingredient_id: string
  quantity: number | null
  unit: string | null
  notes: string | null
  order_index: number
  ingredient?: Ingredient
}

export interface Instruction {
  id: string
  recipe_id: string
  step_number: number
  content: string
  image_url: string | null
}

export interface Tag {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface Bookmark {
  id: string
  user_id: string
  recipe_id: string
  created_at: string
  recipe?: Recipe
}

export interface RecipeNote {
  id: string
  user_id: string
  recipe_id: string
  content: string
  is_private: boolean
  created_at: string
  updated_at: string
}

export interface Like {
  user_id: string
  recipe_id: string
  created_at: string
}
