// ----------------------------------------------------------
// Types mirroring supabase/migrations/0001_init.sql.
// Replace with generated types once your project exists:
//   npx supabase gen types typescript --project-id <id> > types/database.ts
// ----------------------------------------------------------

export type ComponentStatus = "published" | "unpublished" | "removed";
export type PurchaseStatus = "pending" | "succeeded" | "failed" | "refunded";

export interface Profile {
  id: string;
  clerk_user_id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  github_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface Component {
  id: string;
  seller_id: string;
  name: string;
  slug: string | null;
  description: string;
  readme: string | null;
  ecosystems: string[];
  price_cents: number;
  currency: string;
  zip_path: string | null;
  zip_size_bytes: number | null;
  star_count: number;
  download_count: number;
  status: ComponentStatus;
  created_at: string;
  updated_at: string;
}

export interface Tag { id: string; name: string; created_at: string }
export interface ComponentTag { component_id: string; tag_id: string }
export interface Star { user_id: string; component_id: string; created_at: string }

export interface Purchase {
  id: string;
  buyer_id: string;
  component_id: string;
  seller_id: string;
  amount_cents: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  status: PurchaseStatus;
  created_at: string;
  updated_at: string;
}

export interface Download {
  id: string;
  user_id: string;
  component_id: string;
  purchase_id: string | null;
  acquired_at: string;
}

export interface Review {
  id: string;
  component_id: string;
  buyer_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  component_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
}

// Trimmed shape used by browse cards / lists.
export type ComponentSummary = Pick<
  Component,
  "id" | "name" | "description" | "ecosystems" | "price_cents" | "currency" | "star_count" | "download_count"
>;

// Helper to shape each table for the typed Supabase client.
type TableShape<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };

export interface Database {
  public: {
    Tables: {
      profiles: TableShape<Profile>;
      components: TableShape<Component>;
      tags: TableShape<Tag>;
      component_tags: TableShape<ComponentTag>;
      stars: TableShape<Star>;
      purchases: TableShape<Purchase>;
      downloads: TableShape<Download>;
      reviews: TableShape<Review>;
      comments: TableShape<Comment>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
