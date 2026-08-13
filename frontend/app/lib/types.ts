/* Response shapes from the FastAPI backend. */

export type Page<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type CategoryWithCount = Category & { product_count: number };

export type SellerSummary = {
  id: string;
  name: string;
  store_name: string | null;
  avatar_url: string | null;
  whatsapp_number: string | null;
};

export type SellerPublic = {
  id: string;
  name: string;
  store_name: string;
  store_description: string | null;
  whatsapp_number: string | null;
  avatar_url: string | null;
  joined_at: string;
  product_count: number;
};

export type ProductStatus = "active" | "inactive";

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  /** Serialised as a decimal string so cents survive the trip. */
  price: string;
  stock: number;
  status: ProductStatus;
  created_at: string;
  main_image_url: string | null;
  category: Category;
  seller: SellerSummary;
};

export type ProductImage = {
  id: string;
  url: string;
  is_main: boolean;
  sort_order: number;
};

export type Product = ProductListItem & {
  description: string | null;
  updated_at: string;
  images: ProductImage[];
};

export type ChatResponse = {
  answer: string;
  products: ProductListItem[];
};

export type ProductSort = "newest" | "price_asc" | "price_desc";

export type PlatformStats = {
  total_products: number;
  total_sellers: number;
  total_categories: number;
};
