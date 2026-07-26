// Ad Awards Deadline Tracker — Data Store
// Last updated: March 2026
// Update this file annually with new dates, fees, and URLs.

window.AWARDS_DATA = [
  {
    id: "cannes-lions",
    name: "Cannes Lions",
    organization: "Lions Festivals",
    color: "#FFD700",
    website: "https://www.canneslions.com",
    year: 2026,
    location: "Cannes, France",
    eventDates: "June 15–19, 2026",
    deadlines: [
      { label: "Entries Open", date: "2026-01-15", displayDate: "January 15, 2026" },
      { label: "First Late Fee", date: "2026-03-05", displayDate: "March 5, 2026" },
      { label: "Second Late Fee", date: "2026-03-19", displayDate: "March 19, 2026" },
      { label: "Third Late Fee", date: "2026-04-02", displayDate: "April 2, 2026" },
      { label: "Final Deadline", date: "2026-04-09", displayDate: "April 9, 2026" }
    ],
    fees: [
      { tier: "Standard (Lower)", amount: "€690", note: "Audio, Radio, Design, Direct, Outdoor, Print" },
      { tier: "Standard (Mid)", amount: "€865", note: "Brand Exp, Digital Craft, Health, Media, PR, Social" },
      { tier: "Standard (Premium)", amount: "€1,095–€2,375", note: "Entertainment, Film, Titanium" },
      { tier: "Late fees", amount: "+surcharge per period", note: "Increases at each late fee deadline" }
    ],
    resources: [
      { label: "Dates & Fees", url: "https://www.canneslions.com/awards/awards-support/dates-and-fees", type: "entryguide" },
      { label: "Entry Guide", url: "https://www.canneslions.com/awards/awards-support/awards-entry-guide", type: "entryguide" },
      { label: "Rules & Eligibility", url: "https://www.canneslions.com/awards/awards-support/rules-and-eligibility", type: "rulebook" }
    ]
  },
  {
    id: "dandad",
    name: "D&AD Awards",
    organization: "D&AD",
    color: "#FFE600",
    website: "https://www.dandad.org/awards/d-ad-awards/",
    year: 2026,
    location: "London, UK",
    eventDates: "May 2026",
    deadlines: [
      { label: "Super Early Bird (30% off)", date: "2026-01-14", displayDate: "January 14, 2026" },
      { label: "Early Bird (20% off)", date: "2026-02-11", displayDate: "February 11, 2026" },
      { label: "Standard", date: "2026-03-19", displayDate: "March 19, 2026" },
      { label: "Extended Deadline", date: "2026-03-31", displayDate: "March 31, 2026" }
    ],
    fees: [
      { tier: "Super Early Bird", amount: "30% off standard", note: "Payment by Jan 14, submission by Jan 21" },
      { tier: "Early Bird", amount: "20% off standard", note: "Payment by Feb 11, submission by Feb 18" },
      { tier: "Standard", amount: "Full price", note: "Payment by Mar 19, submission by Mar 26" },
      { tier: "Freelancer/Small Biz", amount: "30% discount", note: "Freelancers, nonprofits, <10 employees" }
    ],
    resources: [
      { label: "Entry Kit 2026 (PDF)", url: "https://media.dandad.org/documents/Entry_Kit_2026_ENG.pdf", type: "rulebook" },
      { label: "Submission Guide (PDF)", url: "https://media.dandad.org/documents/Entry_Submission_Guide_2026_ENG.pdf", type: "entryguide" },
      { label: "FAQs", url: "https://www.dandad.org/awards/d-ad-awards/faqs", type: "faq" }
    ]
  },
  {
    id: "one-show",
    name: "The One Show",
    organization: "The One Club for Creativity",
    color: "#00D4FF",
    website: "https://oneshow.org/",
    year: 2026,
    location: "New York, USA",
    eventDates: "May 2026",
    deadlines: [
      { label: "Super Early", date: "2025-10-31", displayDate: "October 31, 2025" },
      { label: "Early", date: "2025-12-12", displayDate: "December 12, 2025" },
      { label: "Regular", date: "2026-01-23", displayDate: "January 23, 2026" },
      { label: "Extended", date: "2026-02-06", displayDate: "February 6, 2026" },
      { label: "Final", date: "2026-02-20", displayDate: "February 20, 2026" }
    ],
    fees: [
      { tier: "Super Early", amount: "Lowest tier", note: "Best pricing available" },
      { tier: "Early", amount: "Reduced rate", note: "Moderate savings" },
      { tier: "Regular", amount: "Standard rate", note: "Standard pricing" },
      { tier: "Extended / Final", amount: "Premium rate", note: "Fees increase each period" }
    ],
    resources: [
      { label: "Deadlines & Dates", url: "https://oneshow.org/dates/", type: "entryguide" },
      { label: "Entry Fees", url: "https://oneshow.org/fees/", type: "entryguide" },
      { label: "Eligibility & Rules", url: "https://oneshow.org/eligibility/", type: "rulebook" },
      { label: "FAQ", url: "https://oneshow.org/faq/", type: "faq" }
    ]
  },
  {
    id: "clio-awards",
    name: "Clio Awards",
    organization: "Clio Awards",
    color: "#E63946",
    website: "https://clios.com/",
    year: 2026,
    location: "New York, USA",
    eventDates: "April 2026",
    deadlines: [
      { label: "1st Deadline", date: "2025-10-24", displayDate: "October 24, 2025" },
      { label: "2nd Deadline", date: "2025-12-12", displayDate: "December 12, 2025" },
      { label: "3rd Deadline", date: "2026-01-16", displayDate: "January 16, 2026" },
      { label: "Final Deadline", date: "2026-02-06", displayDate: "February 6, 2026" }
    ],
    fees: [
      { tier: "1st Deadline", amount: "$525–$1,025", note: "Single entries" },
      { tier: "2nd Deadline", amount: "$625–$1,175", note: "Single entries" },
      { tier: "3rd Deadline", amount: "$750–$1,350", note: "Single entries" },
      { tier: "Final Deadline", amount: "$800–$1,400", note: "Single entries" },
      { tier: "Campaign surcharge", amount: "+$75–$400", note: "On top of single entry fee" },
      { tier: "Student entries", amount: "$50–$75", note: "Single / campaign" }
    ],
    resources: [
      { label: "Key Dates", url: "https://clios.com/the-clio-awards/entry-information/key-dates/", type: "entryguide" },
      { label: "Entry Fees", url: "https://clios.com/the-clio-awards/entry-information/entry-fees/", type: "entryguide" },
      { label: "Entry Packet 2026 (PDF)", url: "https://media.entries.clios.com/programs/21540/files/Clio-Awards_EntryPacket_2026_10.09.pdf", type: "rulebook" },
      { label: "Entry Information", url: "https://clios.com/entry-information/", type: "categories" }
    ]
  },
  {
    id: "lia",
    name: "London International Awards",
    organization: "LIA",
    color: "#9B59B6",
    website: "https://www.liaawards.com/",
    year: 2026,
    location: "Las Vegas, USA",
    eventDates: "September 25 – October 3, 2026 (Judging)",
    deadlines: [
      { label: "Early Bird (35% off)", date: "2026-04-30", displayDate: "April 30, 2026" },
      { label: "Standard (20% off)", date: "2026-06-10", displayDate: "June 10, 2026" },
      { label: "Full Price", date: "2026-07-01", displayDate: "July 1, 2026" }
    ],
    fees: [
      { tier: "Early Bird (35% off)", amount: "$406–$975", note: "Ambient, Audio, Radio, etc." },
      { tier: "Standard (20% off)", amount: "$720–$1,080", note: "Digital, Entertainment, etc." },
      { tier: "Full Price", amount: "$900–$1,500", note: "Gaming, Entertainment Series, etc." }
    ],
    resources: [
      { label: "Entry Fees", url: "https://www.liaawards.com/enter/entry_fees/", type: "entryguide" },
      { label: "Entries Portal", url: "https://www.liaentries.com/", type: "entryguide" }
    ]
  },
  {
    id: "effie-europe",
    name: "Effie Awards Europe",
    organization: "Effie Worldwide",
    color: "#2ECC71",
    website: "https://www.effie-europe.com/",
    year: 2026,
    location: "Europe",
    eventDates: "October–November 2026",
    deadlines: [
      { label: "Entries Open", date: "2026-06-01", displayDate: "June 2026" },
      { label: "1st Deadline", date: "2026-07-30", displayDate: "July 30, 2026" },
      { label: "2nd Deadline", date: "2026-08-13", displayDate: "August 13, 2026" },
      { label: "3rd Deadline", date: "2026-08-27", displayDate: "August 27, 2026" },
      { label: "Final Deadline", date: "2026-09-10", displayDate: "September 10, 2026" }
    ],
    fees: [
      { tier: "1st (Single-Market)", amount: "€995", note: "Best rate" },
      { tier: "1st (Multi-Market)", amount: "€1,895", note: "Best rate" },
      { tier: "2nd (Single/Multi)", amount: "€1,495 / €2,295", note: "" },
      { tier: "3rd (Single/Multi)", amount: "€1,595 / €2,395", note: "" },
      { tier: "Final (Single/Multi)", amount: "€1,695 / €2,495", note: "" }
    ],
    resources: [
      { label: "Call for Entries", url: "https://www.effie-europe.com/call-for-entries/", type: "entryguide" },
      { label: "Fees & Deadlines", url: "https://www.effie-europe.com/call-for-entries/fees-deadlines/", type: "entryguide" },
      { label: "Calendar", url: "https://www.effie-europe.com/calendar/", type: "categories" }
    ]
  },
  {
    id: "adc-awards",
    name: "ADC Awards",
    organization: "The One Club for Creativity",
    color: "#FF6B35",
    website: "https://adcawards.org/",
    year: 2026,
    location: "New York, USA",
    eventDates: "May 2026",
    deadlines: [
      { label: "Regular", date: "2026-01-23", displayDate: "January 23, 2026" },
      { label: "Extended (+$60)", date: "2026-02-06", displayDate: "February 6, 2026" },
      { label: "Final (+$120)", date: "2026-02-20", displayDate: "February 20, 2026" },
      { label: "AI Visual Design", date: "2026-03-16", displayDate: "March 16, 2026" }
    ],
    fees: [
      { tier: "Freelancers", amount: "$75–$300", note: "Per entry" },
      { tier: "Small companies", amount: "$150–$450", note: "11-50 employees" },
      { tier: "Large companies (51+)", amount: "$350–$650", note: "Per entry" },
      { tier: "Ukrainian entrants", amount: "50% discount", note: "All tiers" }
    ],
    resources: [
      { label: "Deadlines & Dates", url: "https://adcawards.org/dates/", type: "entryguide" },
      { label: "Entry Fees", url: "https://adcawards.org/fees/", type: "entryguide" },
      { label: "FAQ", url: "https://adcawards.org/faq/", type: "faq" }
    ]
  },
  {
    id: "webby-awards",
    name: "Webby Awards",
    organization: "International Academy of Digital Arts & Sciences",
    color: "#1DB954",
    website: "https://www.webbyawards.com/",
    year: 2026,
    location: "New York, USA",
    eventDates: "May 2026",
    deadlines: [
      { label: "Final Deadline", date: "2026-02-06", displayDate: "February 6, 2026" }
    ],
    fees: [
      { tier: "Entry Fee", amount: "Contact for pricing", note: "evey@webbyawards.com or 212-675-3555" }
    ],
    resources: [
      { label: "Eligibility & Guidelines", url: "https://www.webbyawards.com/eligibility-and-guidelines/", type: "rulebook" },
      { label: "How to Enter", url: "https://www.webbyawards.com/how-to-enter-the-webby-awards/", type: "entryguide" },
      { label: "FAQ", url: "https://www.webbyawards.com/faq/", type: "faq" }
    ]
  },
  {
    id: "andy-awards",
    name: "ANDY Awards",
    organization: "The Advertising Club of New York",
    color: "#FF1493",
    website: "https://www.andyawards.com/",
    year: 2026,
    location: "New York, USA",
    eventDates: "May 2026",
    deadlines: [
      { label: "Early (15% off)", date: "2026-02-11", displayDate: "February 11, 2026" },
      { label: "Final Deadline", date: "2026-03-17", displayDate: "March 17, 2026" },
      { label: "Extended Deadline", date: "2026-03-24", displayDate: "March 24, 2026" }
    ],
    fees: [
      { tier: "Single (Regular)", amount: "$350", note: "Per entry" },
      { tier: "Single (Late)", amount: "$450", note: "+$250 late fee" },
      { tier: "Campaign (Regular)", amount: "$425", note: "Per entry" },
      { tier: "Campaign (Late)", amount: "$525", note: "+$250 late fee" },
      { tier: "Digital (Regular)", amount: "$475", note: "Per entry" },
      { tier: "Digital (Late)", amount: "$575", note: "+$250 late fee" },
      { tier: "Processing fee", amount: "8%", note: "Applied to all entries" }
    ],
    resources: [
      { label: "Enter Now", url: "https://www.andyawards.com/enter-now/", type: "entryguide" },
      { label: "Official Rules", url: "https://www.andyawards.com/official-rules/", type: "rulebook" },
      { label: "FAQ", url: "https://www.andyawards.com/faq2025/", type: "faq" }
    ]
  },
  {
    id: "eurobest",
    name: "Eurobest",
    organization: "Lions Festivals",
    color: "#E74C3C",
    website: "https://www.eurobest.com/",
    year: 2026,
    location: "Europe",
    eventDates: "November–December 2026",
    deadlines: [
      { label: "Entries Open", date: "2026-08-13", displayDate: "August 13, 2026" },
      { label: "Standard Rate Ends", date: "2026-09-18", displayDate: "September 18, 2026" },
      { label: "2nd Late Fee", date: "2026-10-02", displayDate: "October 2, 2026" },
      { label: "Final Deadline", date: "2026-10-16", displayDate: "October 16, 2026" }
    ],
    fees: [
      { tier: "Standard", amount: "See eurobest.com", note: "Before Sep 18" },
      { tier: "1st Late Fee", amount: "+surcharge", note: "After Sep 18" },
      { tier: "2nd Late Fee", amount: "+surcharge", note: "After Oct 2" }
    ],
    resources: [
      { label: "Dates & Fees", url: "https://www.eurobest.com/support/dates-and-fees", type: "entryguide" },
      { label: "Entry Guide", url: "https://www.eurobest.com/support/eurobest-awards-entry-guide", type: "entryguide" },
      { label: "Help Entering", url: "https://www.eurobest.com/support/help-entering", type: "faq" }
    ]
  },
  {
    id: "guldagget",
    name: "Guldägget",
    organization: "Komm (Sveriges Kommunikationsbyråer)",
    color: "#D4A017",
    website: "https://guldagget.se/",
    year: 2026,
    location: "Stockholm, Sweden",
    eventDates: "April 23, 2026 (Gala)",
    deadlines: [
      { label: "Entries Open", date: "2025-12-05", displayDate: "December 5, 2025" },
      { label: "Guldägget Deadline", date: "2026-01-30", displayDate: "January 30, 2026" },
      { label: "Guldblick & Guldskrift", date: "2026-02-24", displayDate: "February 24, 2026" },
      { label: "Kycklingstipendiet", date: "2026-03-04", displayDate: "March 4, 2026" },
      { label: "Nomineringsvernissage", date: "2026-03-18", displayDate: "March 18, 2026" }
    ],
    fees: [
      { tier: "Komm Members", amount: "3 950 kr", note: "Per entry, excl. moms" },
      { tier: "Non-members", amount: "4 950 kr", note: "Per entry, excl. moms" },
      { tier: "Omställning (Members)", amount: "1 000 kr", note: "Per entry, excl. moms" },
      { tier: "Omställning (Non-members)", amount: "2 000 kr", note: "Per entry, excl. moms" }
    ],
    resources: [
      { label: "Submission Info", url: "https://guldagget.se/tavla/inlamning/", type: "entryguide" },
      { label: "Categories", url: "https://guldagget.se/tavla/tavlingskategorier/", type: "categories" },
      { label: "Competition Info", url: "https://guldagget.se/tavla/tavlingsinformation/", type: "rulebook" },
      { label: "FAQ", url: "https://guldagget.se/tavla/fragor-svar/", type: "faq" },
      { label: "Enter via Komm", url: "https://komm.awardsplatform.com/", type: "entryguide" }
    ]
  },
  {
    id: "100-wattaren",
    name: "100-wattaren",
    organization: "Sveriges Annonsörer",
    color: "#F5A623",
    website: "https://100wattaren.se/",
    year: 2026,
    location: "Stockholm, Sweden",
    eventDates: "Feb 12, 2026 (Gala, Stadshuset)",
    deadlines: [
      { label: "Entries Open", date: "2025-09-17", displayDate: "September 17, 2025" },
      { label: "Regular Deadline", date: "2025-10-22", displayDate: "October 22, 2025" },
      { label: "Extended Deadline (+2000 kr)", date: "2025-10-24", displayDate: "October 24, 2025" },
      { label: "Nominees Announced", date: "2025-12-09", displayDate: "December 9, 2025" },
      { label: "Awards Gala", date: "2026-02-12", displayDate: "February 12, 2026" }
    ],
    fees: [
      { tier: "Regular Entry", amount: "Contact organizer", note: "Per entry" },
      { tier: "Extended Deadline", amount: "+2 000 kr/entry", note: "Late fee surcharge" }
    ],
    resources: [
      { label: "Categories", url: "https://100wattaren.se/kategorier/", type: "categories" },
      { label: "Competition Guide (PDF)", url: "https://100wattaren.se/wp-content/uploads/2025/09/100-wattaren-Tavlingsguide-2025.pdf", type: "rulebook" },
      { label: "Sveriges Annonsörer", url: "https://www.sverigesannonsorer.se/", type: "entryguide" }
    ]
  }
];

// --- Månadens Kampanj Data ---
// Categories, points system, and leaderboard for Resumé's monthly competition
window.MANADENS_DATA = {
  name: "Månadens Kampanj",
  organization: "Resumé",
  website: "https://resume.awardsplatform.com/",
  description: "Sveriges löpande kreativitetstävling – tar tempen på svensk reklam varje månad. Gratis att delta.",
  year: 2026,
  categories: [
    {
      id: "film",
      name: "Månadens Film",
      description: "Bästa reklamfilm – TV, online, sociala medier",
      deadlineInfo: "juni-augusti-omgången",
      nextDeadline: "2026-08-31",
      topList: [{ rank: 1, agency: "Åkestam Holst" }, { rank: 2, agency: "Volvo Cars" }, { rank: 3, agency: "First Lady Agency" }]
    },
    {
      id: "hantverk",
      name: "Månadens Hantverk",
      description: "Bästa hantverk – craft, produktion, utförande",
      deadlineInfo: "maj-augusti-omgången",
      nextDeadline: "2026-08-31",
      topList: [{ rank: 1, agency: "Åkestam Holst" }, { rank: 2, agency: "Kontiki/Rio Pictures" }, { rank: 3, agency: "Forsman & Bodenfors" }]
    },
    {
      id: "ide",
      name: "Månadens Idé",
      description: "Bästa kreativa idé – oavsett kanal eller format",
      deadlineInfo: "juni-augusti-omgången",
      nextDeadline: "2026-08-31",
      topList: [{ rank: 1, agency: "Forsman & Bodenfors" }, { rank: 2, agency: "Åkestam Holst" }, { rank: 3, agency: "Kid Collective" }]
    },
    {
      id: "politik",
      name: "Månadens Politik",
      description: "Bästa politiska kampanj eller samhällskommunikation",
      deadlineInfo: "Datum ej angivet",
      nextDeadline: "",
      topList: [{ rank: 1, agency: "Sosselinjen" }, { rank: 2, agency: "Stoppa hyreschocken" }, { rank: 3, agency: "En enig lokalpolitik i Göteborg" }]
    },
    {
      id: "print",
      name: "Månadens Print",
      description: "Bästa tryckta annons – tidningar, magasin",
      deadlineInfo: "maj-augusti-omgången",
      nextDeadline: "2026-08-31",
      topList: [{ rank: 1, agency: "Knak Agency" }, { rank: 2, agency: "Differ Agency" }, { rank: 3, agency: "Åkestam Holst" }]
    },
    {
      id: "utomhus",
      name: "Månadens Utomhus",
      description: "Bästa utomhusreklam – affischer, DOOH, installationer",
      deadlineInfo: "maj-augusti-omgången",
      nextDeadline: "2026-08-31",
      topList: [{ rank: 1, agency: "Save Our Souls" }, { rank: 2, agency: "Åkestam Holst" }, { rank: 3, agency: "Forsman & Bodenfors" }]
    }
  ],
  pointsSystem: {
    first: 5,
    second: 3,
    third: 1,
    description: "Poäng per placering: 1:a = 5p, 2:a = 3p, 3:a = 1p. Totalställningen summeras över årets alla omgångar."
  },
  leaderboard: [
    { rank: 1, agency: "Åkestam Holst", points: 327, wins: 0, podiums: 0 },
    { rank: 2, agency: "Nord", points: 282, wins: 0, podiums: 0 },
    { rank: 3, agency: "Forsman & Bodenfors", points: 264, wins: 0, podiums: 0 },
    { rank: 4, agency: "Volvo Cars inhouse", points: 159, wins: 0, podiums: 0 },
    { rank: 5, agency: "Save Our Souls", points: 132, wins: 0, podiums: 0 },
    { rank: 6, agency: "BBDO Nordics", points: 99, wins: 0, podiums: 0 },
    { rank: 7, agency: "Knak", points: 90, wins: 0, podiums: 0 },
    { rank: 8, agency: "Kontiki", points: 48, wins: 0, podiums: 0 },
    { rank: 8, agency: "Rio Pictures", points: 48, wins: 0, podiums: 0 },
    { rank: 8, agency: "Differ Agency", points: 48, wins: 0, podiums: 0 },
    { rank: 11, agency: "Qvennerstedt Eghammer Malm", points: 45, wins: 0, podiums: 0 },
    { rank: 12, agency: "Kid collective", points: 27, wins: 0, podiums: 0 },
    { rank: 13, agency: "Stendahls", points: 24, wins: 0, podiums: 0 },
    { rank: 13, agency: "Kurppa Hosk Communications", points: 24, wins: 0, podiums: 0 },
    { rank: 15, agency: "Rocket-Science", points: 9, wins: 0, podiums: 0 },
    { rank: 15, agency: "Spöket", points: 9, wins: 0, podiums: 0 },
    { rank: 15, agency: "Dear Friends", points: 9, wins: 0, podiums: 0 },
    { rank: 15, agency: "First Lady Agency", points: 9, wins: 0, podiums: 0 }
  ],
  lastUpdated: "2026-07-26",
  note: "Ställningen uppdateras efter varje månads bedömning. Besök resume.se för senaste resultat."
};
