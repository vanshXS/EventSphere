const rubric = (items) =>
  items.map(([name, description, weight]) => ({
    name,
    description,
    maxScore: "10",
    weight: String(weight),
  }));

const technicalRubric = () =>
  rubric([
    ["Problem relevance and understanding", "How clearly the entry addresses a meaningful problem.", 30],
    ["Technical quality and implementation", "How effectively and reliably the solution is implemented.", 30],
    ["Creativity and innovation", "Originality and value of the approach.", 20],
    ["Presentation and demonstration", "Clarity and effectiveness of the demonstration.", 20],
  ]);

const culturalRubric = () =>
  rubric([
    ["Skill and execution", "Technique, preparation, and execution.", 35],
    ["Creativity and originality", "Originality and artistic choices.", 25],
    ["Overall performance quality", "Cohesion and quality of the performance.", 25],
    ["Stage presence and delivery", "Confidence, engagement, and delivery.", 15],
  ]);

const sportsRubric = () =>
  rubric([
    ["Technical skill and execution", "Control, technique, and execution.", 35],
    ["Strategy and teamwork", "Decision-making and collaboration.", 25],
    ["Rules and sportsmanship", "Fair play and respect for the rules.", 20],
    ["Overall performance", "Effectiveness and consistency of performance.", 20],
  ]);

const generalRubric = () =>
  rubric([
    ["Quality and relevance", "How well the entry meets its purpose.", 30],
    ["Execution and completeness", "Quality and completeness of the work.", 30],
    ["Creativity and problem-solving", "Originality and effectiveness of ideas.", 20],
    ["Presentation and communication", "Clarity of the explanation or presentation.", 20],
  ]);

export const getRecommendedRubric = (activityType) => {
  switch (activityType) {
    case "HACKATHON":
    case "TECHNICAL_COMPETITION":
      return technicalRubric();
    case "CULTURAL":
      return culturalRubric();
    case "SPORTS":
      return sportsRubric();
    default:
      return generalRubric();
  }
};
