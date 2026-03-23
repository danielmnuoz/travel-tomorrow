export type PlaceCategory =
  | "food"
  | "cafe"
  | "activity"
  | "landmark"
  | "shopping"
  | "nightlife";

export interface PlaceSearchResult {
  name: string;
  display_name: string;
  latitude: number;
  longitude: number;
  category?: PlaceCategory;
}

export interface MustVisitPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category?: PlaceCategory;
}

export interface ItineraryRequest {
  city: string;
  days: number;
  budget: number;
  pace: number;
  transport: string;
  food_styles: string[];
  interests: string[];
  address?: string;
  neighborhoods?: string[];
  must_visits?: MustVisitPlace[];
  max_food_stops?: number;
}

export interface Neighborhood {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export type PlaceIcon =
  | "utensils"
  | "coffee"
  | "shopping"
  | "trees"
  | "landmark"
  | "museum"
  | "palette"
  | "wine"
  | "beer"
  | "map-pin";

export interface PlaceStop {
  fsq_id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: PlaceCategory;
  time_slot: string;
  icon: PlaceIcon;
  description: string;
  rating?: number;
  price?: number;
  pinned?: boolean;
}

export interface DayPlan {
  day_number: number;
  neighborhood: string;
  theme: string;
  stops: PlaceStop[];
}

export interface ItineraryResponse {
  city: string;
  days: DayPlan[];
}

export interface RefreshStopRequest {
  preferences: ItineraryRequest;
  current_day: DayPlan;
  stop_fsq_id: string;
}

export interface RefreshStopResponse {
  new_stop: PlaceStop;
}
