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

export type InquiryStatus = "new" | "contacted" | "closed";

export type Inquiry = {
  id: string;
  product_id: string;
  buyer_name: string;
  buyer_contact: string;
  message: string | null;
  status: InquiryStatus;
  created_at: string;
  updated_at: string;
  product: {
    id: string;
    name: string;
    slug: string;
    main_image_url: string | null;
  } | null;
};

export type Notification = {
  id: string;
  type: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type ProductMetric = {
  product_id: string;
  name: string;
  slug: string;
  main_image_url: string | null;
  value: number;
};

export type SellerDashboard = {
  active_products: number;
  inactive_products: number;
  total_inquiries: number;
  inquiries_by_status: { new: number; contacted: number; closed: number };
  unread_notifications: number;
  most_viewed_products: ProductMetric[];
  most_inquired_products: ProductMetric[];
  period_days: number;
};

export type AdminDashboard = {
  total_sellers: number;
  total_products: number;
  total_categories: number;
  total_inquiries: number;
  inquiries_in_period: number;
  new_listings_in_period: number;
  category_performance: {
    category_id: string;
    name: string;
    slug: string;
    product_count: number;
    inquiry_count: number;
  }[];
  seller_performance: {
    seller_id: string;
    name: string;
    store_name: string | null;
    product_count: number;
    inquiry_count: number;
  }[];
  trends: { week_start: string; new_listings: number; inquiries: number }[];
  top_viewed_products: ProductMetric[];
  period_days: number;
};

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  is_active: boolean;
  roles: string[];
  seller_profile: {
    store_name: string;
    store_description: string | null;
    whatsapp_number: string | null;
    avatar_url: string | null;
  } | null;
};
