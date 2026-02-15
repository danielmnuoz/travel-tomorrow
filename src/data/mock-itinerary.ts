export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "food" | "activity" | "cafe" | "landmark";
  description: string;
  timeOfDay: "morning" | "afternoon" | "evening";
}

export interface Day {
  id: number;
  title: string;
  neighborhood: string;
  description: string;
  stops: Stop[];
}

export interface Itinerary {
  city: string;
  days: Day[];
}

export const mockItinerary: Itinerary = {
  city: "New York City",
  days: [
    {
      id: 1,
      title: "Day 1",
      neighborhood: "Lower Manhattan & SoHo",
      description:
        "Explore the charming streets of SoHo, taste your way through Little Italy, and wander into Chinatown.",
      stops: [
        {
          id: "d1s1",
          name: "La Colombe Coffee",
          lat: 40.7237,
          lng: -73.9992,
          type: "cafe",
          description:
            "Start your morning with a draft latte at this beloved SoHo roaster.",
          timeOfDay: "morning",
        },
        {
          id: "d1s2",
          name: "SoHo Cast-Iron District Walk",
          lat: 40.7233,
          lng: -74.0005,
          type: "activity",
          description:
            "Stroll through cobblestone streets lined with 19th-century cast-iron architecture and boutique shops.",
          timeOfDay: "morning",
        },
        {
          id: "d1s3",
          name: "Lombardi's Pizza",
          lat: 40.7216,
          lng: -73.9955,
          type: "food",
          description:
            "Grab a slice at America's first pizzeria, open since 1905 on Spring Street.",
          timeOfDay: "afternoon",
        },
        {
          id: "d1s4",
          name: "Little Italy & Mulberry Street",
          lat: 40.7195,
          lng: -73.9973,
          type: "activity",
          description:
            "Walk through the heart of Little Italy, browse the bakeries and old-school Italian delis.",
          timeOfDay: "afternoon",
        },
        {
          id: "d1s5",
          name: "Nom Wah Tea Parlor",
          lat: 40.7142,
          lng: -73.998,
          type: "food",
          description:
            "End the day with dim sum at NYC's oldest dim sum parlor in Chinatown, open since 1920.",
          timeOfDay: "evening",
        },
      ],
    },
    {
      id: 2,
      title: "Day 2",
      neighborhood: "Midtown & Central Park",
      description:
        "Take in the icons — from Times Square energy to Central Park calm, with world-class art in between.",
      stops: [
        {
          id: "d2s1",
          name: "Central Park Morning Walk",
          lat: 40.7829,
          lng: -73.9654,
          type: "activity",
          description:
            "Start with a peaceful loop around the Reservoir or stroll through the Ramble.",
          timeOfDay: "morning",
        },
        {
          id: "d2s2",
          name: "The Met Breuer Cafe",
          lat: 40.7736,
          lng: -73.9639,
          type: "cafe",
          description:
            "Grab coffee and a pastry near Museum Mile before the crowds.",
          timeOfDay: "morning",
        },
        {
          id: "d2s3",
          name: "MoMA — Museum of Modern Art",
          lat: 40.7614,
          lng: -73.9776,
          type: "landmark",
          description:
            "Spend a couple of hours with Van Gogh's Starry Night, Warhol, and rotating modern exhibits.",
          timeOfDay: "afternoon",
        },
        {
          id: "d2s4",
          name: "Times Square & Broadway Walk",
          lat: 40.758,
          lng: -73.9855,
          type: "activity",
          description:
            "Experience the sensory overload of Times Square — lights, billboards, and street performers.",
          timeOfDay: "afternoon",
        },
        {
          id: "d2s5",
          name: "Joe's Shanghai",
          lat: 40.7571,
          lng: -73.9882,
          type: "food",
          description:
            "Finish with legendary soup dumplings at this Midtown staple.",
          timeOfDay: "evening",
        },
      ],
    },
    {
      id: 3,
      title: "Day 3",
      neighborhood: "Brooklyn — DUMBO & Williamsburg",
      description:
        "Cross the bridge into Brooklyn for waterfront views, street art, and some of the best food in the city.",
      stops: [
        {
          id: "d3s1",
          name: "Brooklyn Bridge Walk",
          lat: 40.7061,
          lng: -73.9969,
          type: "landmark",
          description:
            "Walk across the iconic Brooklyn Bridge with stunning views of the Manhattan skyline.",
          timeOfDay: "morning",
        },
        {
          id: "d3s2",
          name: "Time Out Market (DUMBO)",
          lat: 40.7033,
          lng: -73.9903,
          type: "food",
          description:
            "Explore the waterfront food hall with curated stalls from top NYC chefs.",
          timeOfDay: "morning",
        },
        {
          id: "d3s3",
          name: "Brooklyn Bridge Park",
          lat: 40.7024,
          lng: -73.9896,
          type: "activity",
          description:
            "Relax along the East River waterfront with views of the Manhattan skyline and Statue of Liberty.",
          timeOfDay: "afternoon",
        },
        {
          id: "d3s4",
          name: "Williamsburg Street Art Walk",
          lat: 40.7081,
          lng: -73.9571,
          type: "activity",
          description:
            "Wander through Williamsburg's murals and graffiti-covered warehouses.",
          timeOfDay: "afternoon",
        },
        {
          id: "d3s5",
          name: "Smorgasburg Vendors / Diner",
          lat: 40.7153,
          lng: -73.9611,
          type: "food",
          description:
            "Wrap up with street food or a sit-down meal at one of Williamsburg's buzzing eateries.",
          timeOfDay: "evening",
        },
      ],
    },
  ],
};
