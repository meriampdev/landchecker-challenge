export type Property = {
  id: number;
  title: string;
  address: string;
  suburb: string;
  property_type: "house" | "apartment" | "townhouse";
  price_cents: number;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  status: "available" | "under_offer" | "sold";
  image_path: string;
  updated_at: string;
};
export type Filters = {
  location?: string;
  min_price?: string;
  max_price?: string;
  min_bedrooms?: string;
  property_type?: string;
};
export type Results = {
  properties: Property[];
  meta: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
};
