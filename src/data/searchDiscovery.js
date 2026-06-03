export const SEARCH_ARTWORK_PALETTES = [
  { from: "#193B68", via: "#3D7EC8", to: "#B9D7F6" },
  { from: "#0E7490", via: "#67E8F9", to: "#CFFAFE" },
  { from: "#6B5DD3", via: "#9C8CFF", to: "#E6DFFF" },
  { from: "#0F766E", via: "#34C3AA", to: "#C8F7EC" },
  { from: "#A855F7", via: "#D18BFF", to: "#F1D9FF" },
  { from: "#EA580C", via: "#FDBA74", to: "#FFEDD5" },
  { from: "#BE123C", via: "#FB7185", to: "#FFE4E6" },
  { from: "#1D4ED8", via: "#60A5FA", to: "#DBEAFE" },
];

export const SEARCH_DISCOVERY_CATEGORIES = [
  { id: "books", title: "Books", description: "Find books, school books, academic sources, and reading material." },
  { id: "schools", title: "Schools", description: "Explore schools, education systems, programs, and nearby options." },
  { id: "universities", title: "Universities", description: "Search universities, majors, degrees, and admission information." },
  { id: "science", title: "Science", description: "Search physics, chemistry, biology, and scientific topics." },
  { id: "mathematics", title: "Mathematics", description: "Find explanations, formulas, lessons, and math resources." },
  { id: "history", title: "History", description: "Explore events, civilizations, wars, timelines, and historical topics." },
  { id: "geography", title: "Geography", description: "Search countries, maps, cities, climate, and world facts." },
  { id: "homework", title: "Homework", description: "Get help finding resources for homework and school questions." },
  { id: "research-papers", title: "Research Papers", description: "Discover academic papers, studies, and reliable sources." },
  { id: "people", title: "People", description: "Search famous people, scientists, leaders, authors, and biographies." },
  { id: "technology-ai", title: "Technology & AI", description: "Search technology, programming, AI, devices, and digital trends." },
  { id: "news", title: "News", description: "Find recent updates, current events, and trending topics." },
  { id: "sports", title: "Sports", description: "Search players, teams, clubs, competitions, and sports facts." },
  { id: "travel-places", title: "Travel & Places", description: "Explore places, destinations, landmarks, and travel information." },
  { id: "general-web-search", title: "General Search", description: "Search anything else across the web." },
].map((category, index) => ({
  ...category,
  artwork: SEARCH_ARTWORK_PALETTES[index % SEARCH_ARTWORK_PALETTES.length],
  sectionTitle: "Search",
}));

const BOOK_SEARCH_RESULTS = [
  "Atomic Habits",
  "Deep Work",
  "The Power of Habit",
  "Thinking, Fast and Slow",
  "A Brief History of Time",
  "Campbell Biology",
  "University Physics",
  "Calculus Made Easy",
  "Sapiens",
  "1984",
  "To Kill a Mockingbird",
  "The Alchemist",
  "The Lean Startup",
  "The Art of War",
  "The Psychology of Money",
  "Pride and Prejudice",
  "The Great Gatsby",
  "Clean Code",
  "Introduction to Algorithms",
  "Organic Chemistry",
  "Linear Algebra Done Right",
  "The Hobbit",
  "Harry Potter and the Sorcerer's Stone",
  "The Little Prince",
  "Educated",
];

const SEARCH_RESULT_SEEDS = {
  schools: ["International School", "Public School System", "STEM School", "Language School", "Online School"],
  universities: ["Computer Science Major", "Medical School", "Engineering Degree", "Scholarships", "Admissions Guide"],
  science: ["Physics Basics", "Chemistry Lab", "Biology Cells", "Scientific Method", "Astronomy"],
  mathematics: ["Algebra", "Geometry", "Calculus", "Statistics", "Trigonometry"],
  history: ["World War II", "Ancient Egypt", "Roman Empire", "Industrial Revolution", "Cold War"],
  geography: ["World Maps", "Climate Zones", "Capital Cities", "Mountain Ranges", "Population Data"],
  homework: ["Math Homework", "Science Project", "Essay Help", "Study Resources", "Practice Questions"],
  "research-papers": ["Google Scholar", "PubMed", "ResearchGate", "Citation Help", "Academic Databases"],
  people: ["Albert Einstein", "Marie Curie", "Nelson Mandela", "Jane Austen", "Ada Lovelace"],
  "technology-ai": ["Artificial Intelligence", "Programming", "Smartphones", "Cybersecurity", "Robotics"],
  news: ["World News", "Technology News", "Science Updates", "Business News", "Education News"],
  sports: ["Football", "Basketball", "Tennis", "Olympics", "Formula 1"],
  "travel-places": ["Paris", "Tokyo", "New York", "Historical Landmarks", "Travel Planning"],
  "general-web-search": ["Web Search", "How-to Guides", "Product Reviews", "Definitions", "Local Information"],
};

export function getSearchCategoryById(categoryId) {
  return SEARCH_DISCOVERY_CATEGORIES.find((category) => category.id === categoryId) || null;
}

export function getSearchResultsForCategory(category) {
  if (!category) return [];

  const titles = category.id === "books"
    ? BOOK_SEARCH_RESULTS
    : Array.from({ length: 25 }, (_, index) => {
      const seed = SEARCH_RESULT_SEEDS[category.id]?.[index % 5] || category.title;
      return `${seed} ${Math.floor(index / 5) + 1}`;
    });

  return titles.slice(0, 25).map((title, index) => ({
    id: `${category.id}-${index + 1}`,
    title,
    description: category.id === "books"
      ? `A search result card for ${title}, ready for summaries, details, and AI-guided exploration.`
      : `Placeholder details for ${title}. More reliable search data will be connected later.`,
    details: [
      `${title} includes useful background, related information, and learning directions.`,
      "This expanded view is a temporary detail card until real search data is connected.",
      "Use Ask AI when you want BlueMind to explain, summarize, compare, or help you continue from this result.",
    ].join(" "),
    category: category.title,
    categoryId: category.id,
    sectionTitle: category.title,
    artwork: SEARCH_ARTWORK_PALETTES[(index + 2) % SEARCH_ARTWORK_PALETTES.length],
  }));
}
