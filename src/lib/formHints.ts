export interface FormHint {
  id: string;
  section: "style" | "preferences" | "transport" | "advanced";
  message: string;
}

interface FormState {
  budget: number;
  foodStyles: string[];
  interests: string[];
  pace: number;
  transport: string;
  neighborhoods: string[];
  days: number;
}

export function getFormHints(state: FormState): FormHint[] {
  const hints: FormHint[] = [];

  if (state.foodStyles.length === 0) {
    hints.push({
      id: "no-food",
      section: "preferences",
      message: "No food style selected — we'll skip food recommendations.",
    });
  }

  if (state.interests.length === 0) {
    hints.push({
      id: "no-interests",
      section: "preferences",
      message:
        "No interests selected — the planner won't know what activities to suggest.",
    });
  }

  if (state.pace >= 4 && state.transport === "Walk") {
    hints.push({
      id: "packed-walk",
      section: "transport",
      message:
        "A packed day on foot covers a lot of ground — consider Metro or Mix if your feet tire easily.",
    });
  }

  if (state.pace <= 2 && state.interests.length >= 4) {
    hints.push({
      id: "relaxed-many-interests",
      section: "preferences",
      message:
        "With a relaxed pace you'll only hit a couple of these per day — and that's okay.",
    });
  }

  if (state.neighborhoods.length > state.days * 2) {
    hints.push({
      id: "neighborhoods-vs-days",
      section: "advanced",
      message: `That's a lot of neighborhoods for ${state.days} day(s) — the planner may not cover them all.`,
    });
  }

  return hints;
}
