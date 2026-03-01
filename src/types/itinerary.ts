export interface ItineraryRequest {
  city: string;
  days: number;
  budget: number;
  pace: number;
  transport: string;
  food_styles: string[];
  interests: string[];
}

export interface PlaceStop {
  fsq_id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  time_slot: string;
  description: string;
  rating?: number;
  price?: number;
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
