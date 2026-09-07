import type { EventSeed } from "@/types/database";

/**
 * Full list of Rat Race events. Each event includes a curated list of
 * "top favourites" shown as dropdown options in the prediction form. Users
 * can always select "Other" and provide a free-text answer instead.
 *
 * `display_order` controls the order events appear in the submission form
 * and is also used as a stable seed order for the SQL migration.
 */
export const RAT_RACE_EVENTS: EventSeed[] = [
  // ---------------------------------------------------------------- AFL
  {
    category: "AFL",
    name: "AFL Minor Premier 2027",
    description: "Team finishing top of the ladder after the home & away season.",
    display_order: 1,
    options: [
      "Collingwood", "Brisbane Lions", "Sydney Swans", "Geelong Cats", "Port Adelaide",
      "Carlton", "Western Bulldogs", "GWS Giants", "Gold Coast Suns", "Adelaide Crows",
      "Melbourne", "Fremantle", "St Kilda", "Hawthorn", "Essendon",
      "West Coast Eagles", "North Melbourne", "Richmond", "Footscray", "Sydney",
    ],
  },
  {
    category: "AFL",
    name: "AFL Premier 2027",
    description: "Winner of the AFL Grand Final.",
    display_order: 2,
    options: [
      "Collingwood", "Brisbane Lions", "Sydney Swans", "Geelong Cats", "Port Adelaide",
      "Carlton", "Western Bulldogs", "GWS Giants", "Gold Coast Suns", "Adelaide Crows",
      "Melbourne", "Fremantle", "St Kilda", "Hawthorn", "Essendon",
      "West Coast Eagles", "North Melbourne", "Richmond",
    ],
  },
  {
    category: "AFL",
    name: "Brownlow Medallist 2027",
    description: "AFL's official award for the fairest and best player of the season.",
    display_order: 3,
    options: [
      "Nick Daicos", "Marcus Bontempelli", "Lachie Neale", "Patrick Cripps", "Zach Merrett",
      "Andrew Brayshaw", "Jordan Dawson", "Errol Gulden", "Christian Petracca", "Touk Miller",
      "Rowan Marshall", "Tom Green", "Matt Rowell", "Caleb Serong", "Clayton Oliver",
    ],
  },
  {
    category: "AFL",
    name: "AFLCA Champion Player of the Year 2027",
    description: "Awarded by AFL coaches to the season's best player.",
    display_order: 4,
    options: [
      "Nick Daicos", "Marcus Bontempelli", "Lachie Neale", "Patrick Cripps", "Zach Merrett",
      "Andrew Brayshaw", "Jordan Dawson", "Errol Gulden", "Christian Petracca", "Touk Miller",
    ],
  },
  {
    category: "AFL",
    name: "Coleman Medallist 2027",
    description: "Awarded to the AFL season's leading goal-kicker.",
    display_order: 5,
    options: [
      "Charlie Curnow", "Jamie Elliott", "Harry McKay", "Ben King", "Jack Riewoldt",
      "Tom Hawkins", "Aaron Naughton", "Sam Darcy", "Jesse Hogan", "Mitch Georgiades",
    ],
  },
  {
    category: "AFL",
    name: "Rising Star Winner 2027",
    description: "Awarded to the AFL's best first or second year player.",
    display_order: 6,
    options: [
      "Harley Reid", "Nick Watson", "Zane Duursma", "Jed Walter", "Sam Lalor",
      "Josh Rachele", "Colby McKercher",
    ],
  },
  {
    category: "AFL",
    name: "AFLW Premier 2027",
    description: "Winner of the AFLW Grand Final.",
    display_order: 7,
    options: [
      "North Melbourne", "Brisbane Lions", "Adelaide Crows", "Melbourne", "Port Adelaide",
      "Fremantle", "Collingwood", "Carlton", "Geelong Cats", "Western Bulldogs",
    ],
  },
  {
    category: "AFL",
    name: "AFLW Best & Fairest 2027",
    description: "AFLW's official award for the fairest and best player of the season.",
    display_order: 8,
    options: [
      "Ash Riddell", "Kate Surman", "Aisling Utri", "Alyssa Bannan", "Daisy Pearce",
      "Erin Phillips", "Jasmine Garner", "Charlie Rowbottom",
    ],
  },
  {
    category: "AFL",
    name: "WAFL Premier 2027",
    description: "Winner of the WAFL Grand Final.",
    display_order: 9,
    options: [
      "South Fremantle", "East Fremantle", "Subiaco", "West Perth", "Claremont",
      "East Perth", "Swan Districts", "Perth", "Peel Thunder",
    ],
  },
  {
    category: "AFL",
    name: "Sandover Medallist 2027",
    description: "Awarded to the WAFL's fairest and best player.",
    display_order: 10,
    options: [
      "Player from South Fremantle", "Player from East Fremantle", "Player from Subiaco",
      "Player from West Perth", "Player from Claremont", "Player from East Perth",
      "Player from Swan Districts", "Player from Perth", "Player from Peel Thunder",
    ],
  },

  // ------------------------------------------------------------- Cricket
  {
    category: "Cricket",
    name: "BBL Champion 2026-27",
    description: "Winner of the Big Bash League final.",
    display_order: 11,
    options: [
      "Sydney Sixers", "Perth Scorchers", "Brisbane Heat", "Melbourne Stars",
      "Melbourne Renegades", "Adelaide Strikers", "Sydney Thunder", "Hobart Hurricanes",
    ],
  },
  {
    category: "Cricket",
    name: "BBL Top Runscorer 2026-27",
    description: "Leading run-scorer of the Big Bash League season.",
    display_order: 12,
    options: [
      "Josh Philippe", "Jake Fraser-McGurk", "Matthew Short", "Marcus Stoinis",
      "Colin Munro", "David Warner", "Travis Head", "Cameron Bancroft",
    ],
  },
  {
    category: "Cricket",
    name: "BBL Leading Wicket Taker 2026-27",
    description: "Leading wicket-taker of the Big Bash League season.",
    display_order: 13,
    options: [
      "Adam Zampa", "Andrew Tye", "Xavier Bartlett", "Nathan Ellis",
      "Riley Meredith", "Spencer Johnson", "Wes Agar",
    ],
  },
  {
    category: "Cricket",
    name: "Sheffield Shield Winner 2026-27",
    description: "Winner of Australia's first-class domestic cricket competition.",
    display_order: 14,
    options: [
      "New South Wales", "Victoria", "Queensland", "Western Australia",
      "South Australia", "Tasmania",
    ],
  },
  {
    category: "Cricket",
    name: "Marsh One-Day Cup Winner 2026-27",
    description: "Winner of Australia's domestic one-day cricket competition.",
    display_order: 15,
    options: [
      "New South Wales", "Victoria", "Queensland", "Western Australia",
      "South Australia", "Tasmania",
    ],
  },
  {
    category: "Cricket",
    name: "Allan Border Medallist 2027",
    description: "Cricket Australia's award for Australia's player of the year.",
    display_order: 16,
    options: [
      "Pat Cummins", "Steve Smith", "Travis Head", "Mitchell Starc", "Josh Hazlewood",
      "Marnus Labuschagne", "Alex Carey", "Beth Mooney", "Ellyse Perry", "Annabel Sutherland",
    ],
  },
  {
    category: "Cricket",
    name: "ICC Men's Cricket World Cup Winner 2027",
    description: "Winner of the ICC Men's Cricket World Cup.",
    display_order: 17,
    options: [
      "Australia", "India", "England", "South Africa", "New Zealand",
      "Pakistan", "Sri Lanka", "West Indies", "Bangladesh", "Afghanistan",
    ],
  },

  // ------------------------------------------------------- American Football
  {
    category: "American Football",
    name: "AFC Champion (2026 Season)",
    description: "Winner of the AFC Championship, advancing to the Super Bowl.",
    display_order: 18,
    options: [
      "Kansas City Chiefs", "Buffalo Bills", "Baltimore Ravens", "Cincinnati Bengals",
      "Houston Texans", "Miami Dolphins", "Pittsburgh Steelers", "Los Angeles Chargers",
      "Cleveland Browns", "Denver Broncos", "Jacksonville Jaguars", "Indianapolis Colts",
      "Tennessee Titans", "New York Jets", "Las Vegas Raiders", "New England Patriots",
    ],
  },
  {
    category: "American Football",
    name: "NFC Champion (2026 Season)",
    description: "Winner of the NFC Championship, advancing to the Super Bowl.",
    display_order: 19,
    options: [
      "San Francisco 49ers", "Philadelphia Eagles", "Dallas Cowboys", "Detroit Lions",
      "Green Bay Packers", "Tampa Bay Buccaneers", "Los Angeles Rams", "Minnesota Vikings",
      "Atlanta Falcons", "New Orleans Saints", "Seattle Seahawks", "Chicago Bears",
      "Washington Commanders", "New York Giants", "Arizona Cardinals", "Carolina Panthers",
    ],
  },
  {
    category: "American Football",
    name: "Super Bowl LXI Winner",
    description: "Winner of Super Bowl LXI.",
    display_order: 20,
    options: [
      "Kansas City Chiefs", "Buffalo Bills", "Baltimore Ravens", "San Francisco 49ers",
      "Philadelphia Eagles", "Dallas Cowboys", "Detroit Lions", "Green Bay Packers",
      "Houston Texans", "Miami Dolphins", "Tampa Bay Buccaneers", "Los Angeles Rams",
    ],
  },
  {
    category: "American Football",
    name: "NFL MVP 2026",
    description: "NFL's Most Valuable Player award for the 2026 season.",
    display_order: 21,
    options: [
      "Patrick Mahomes", "Josh Allen", "Lamar Jackson", "Jalen Hurts", "Joe Burrow",
      "C.J. Stroud", "Justin Herbert", "Jayden Daniels", "Christian McCaffrey", "Tyreek Hill",
    ],
  },
  {
    category: "American Football",
    name: "Offensive Player of the Year",
    description: "NFL's Offensive Player of the Year award.",
    display_order: 22,
    options: [
      "Patrick Mahomes", "Josh Allen", "Christian McCaffrey", "Tyreek Hill", "CeeDee Lamb",
      "Jalen Hurts", "Joe Burrow", "Amon-Ra St. Brown", "Saquon Barkley",
    ],
  },
  {
    category: "American Football",
    name: "Defensive Player of the Year",
    description: "NFL's Defensive Player of the Year award.",
    display_order: 23,
    options: [
      "Myles Garrett", "T.J. Watt", "Micah Parsons", "Aidan Hutchinson", "Maxx Crosby",
      "Fred Warner", "Roquan Smith", "Antoine Winfield Jr.",
    ],
  },
  {
    category: "American Football",
    name: "College Football Playoff Champion",
    description: "Winner of the College Football Playoff National Championship.",
    display_order: 24,
    options: [
      "Georgia", "Ohio State", "Michigan", "Alabama", "Texas", "Oregon",
      "Notre Dame", "Penn State", "Clemson", "LSU", "Florida State", "USC",
    ],
  },

  // ---------------------------------------------------------- Basketball
  {
    category: "Basketball",
    name: "NBL Champion 2026-27",
    description: "Winner of the National Basketball League (Australia) championship series.",
    display_order: 25,
    options: [
      "Melbourne United", "Perth Wildcats", "New Zealand Breakers", "Tasmania JackJumpers",
      "Sydney Kings", "Illawarra Hawks", "Adelaide 36ers", "Brisbane Bullets",
      "South East Melbourne Phoenix", "Cairns Taipans",
    ],
  },
  {
    category: "Basketball",
    name: "NBL MVP 2026-27",
    description: "NBL's Most Valuable Player award.",
    display_order: 26,
    options: [
      "Bryce Cotton", "Jack McVeigh", "Sunday Dech", "Will Magnay",
      "DJ Hogg", "Xavier Cooks", "Josh Giddey",
    ],
  },
  {
    category: "Basketball",
    name: "NBA Eastern Conference Champion 2027",
    description: "Winner of the NBA Eastern Conference Finals.",
    display_order: 27,
    options: [
      "Boston Celtics", "New York Knicks", "Milwaukee Bucks", "Cleveland Cavaliers",
      "Indiana Pacers", "Orlando Magic", "Philadelphia 76ers", "Miami Heat", "Atlanta Hawks",
    ],
  },
  {
    category: "Basketball",
    name: "NBA Western Conference Champion 2027",
    description: "Winner of the NBA Western Conference Finals.",
    display_order: 28,
    options: [
      "Denver Nuggets", "Oklahoma City Thunder", "Minnesota Timberwolves", "Dallas Mavericks",
      "Los Angeles Lakers", "Phoenix Suns", "Golden State Warriors", "Memphis Grizzlies",
      "Sacramento Kings", "Houston Rockets",
    ],
  },
  {
    category: "Basketball",
    name: "NBA Champion 2027",
    description: "Winner of the NBA Finals.",
    display_order: 29,
    options: [
      "Boston Celtics", "Denver Nuggets", "Oklahoma City Thunder", "New York Knicks",
      "Minnesota Timberwolves", "Milwaukee Bucks", "Dallas Mavericks", "Los Angeles Lakers",
      "Cleveland Cavaliers", "Phoenix Suns",
    ],
  },
  {
    category: "Basketball",
    name: "NBA MVP 2026-27",
    description: "NBA's Most Valuable Player award.",
    display_order: 30,
    options: [
      "Nikola Jokic", "Shai Gilgeous-Alexander", "Luka Doncic", "Giannis Antetokounmpo",
      "Jayson Tatum", "Anthony Edwards", "Victor Wembanyama", "Joel Embiid",
    ],
  },
  {
    category: "Basketball",
    name: "March Madness Champion 2027",
    description: "Winner of the NCAA Men's Division I Basketball Tournament.",
    display_order: 31,
    options: [
      "Duke", "Kansas", "Kentucky", "UConn", "North Carolina", "Houston",
      "Purdue", "Auburn", "Arizona", "Gonzaga", "Alabama", "Tennessee",
    ],
  },

  // --------------------------------------------------- Baseball / Ice Hockey
  {
    category: "Baseball",
    name: "World Series Champion 2027",
    description: "Winner of Major League Baseball's World Series.",
    display_order: 32,
    options: [
      "Los Angeles Dodgers", "New York Yankees", "Atlanta Braves", "Houston Astros",
      "Philadelphia Phillies", "Baltimore Orioles", "Texas Rangers", "San Diego Padres",
      "New York Mets", "Cleveland Guardians",
    ],
  },
  {
    category: "Ice Hockey",
    name: "Stanley Cup Champion 2027",
    description: "Winner of the NHL's Stanley Cup Finals.",
    display_order: 33,
    options: [
      "Florida Panthers", "Edmonton Oilers", "Dallas Stars", "Colorado Avalanche",
      "New York Rangers", "Vegas Golden Knights", "Toronto Maple Leafs", "Boston Bruins",
      "Carolina Hurricanes", "Winnipeg Jets",
    ],
  },

  // ----------------------------------------------------------------- Soccer
  {
    category: "Soccer",
    name: "EPL Champion 2026-27",
    description: "Winner of the English Premier League.",
    display_order: 34,
    options: [
      "Manchester City", "Arsenal", "Liverpool", "Chelsea", "Manchester United",
      "Tottenham Hotspur", "Newcastle United", "Aston Villa", "Brighton", "West Ham United",
    ],
  },
  {
    category: "Soccer",
    name: "FA Cup Winner 2027",
    description: "Winner of the English FA Cup.",
    display_order: 35,
    options: [
      "Manchester City", "Arsenal", "Liverpool", "Chelsea", "Manchester United",
      "Tottenham Hotspur", "Newcastle United", "Aston Villa",
    ],
  },
  {
    category: "Soccer",
    name: "UEFA Champions League Winner 2027",
    description: "Winner of the UEFA Champions League.",
    display_order: 36,
    options: [
      "Real Madrid", "Manchester City", "Bayern Munich", "Paris Saint-Germain",
      "Liverpool", "Barcelona", "Arsenal", "Inter Milan", "Atletico Madrid",
      "Borussia Dortmund", "AC Milan", "Juventus",
    ],
  },
  {
    category: "Soccer",
    name: "UEFA Europa League Winner 2027",
    description: "Winner of the UEFA Europa League.",
    display_order: 37,
    options: [
      "Tottenham Hotspur", "Ajax", "AS Roma", "Sevilla", "Atalanta",
      "Bayer Leverkusen", "Rangers", "Fiorentina",
    ],
  },
  {
    category: "Soccer",
    name: "A-League Champion 2026-27",
    description: "Winner of the A-League Men's Grand Final.",
    display_order: 38,
    options: [
      "Melbourne City", "Melbourne Victory", "Sydney FC", "Central Coast Mariners",
      "Western Sydney Wanderers", "Wellington Phoenix", "Adelaide United",
      "Perth Glory", "Macarthur FC", "Brisbane Roar",
    ],
  },
  {
    category: "Soccer",
    name: "Ballon d'Or 2027",
    description: "Awarded to the world's best male soccer player.",
    display_order: 39,
    options: [
      "Vinicius Jr", "Jude Bellingham", "Kylian Mbappe", "Erling Haaland",
      "Rodri", "Lamine Yamal", "Bukayo Saka", "Dani Carvajal",
    ],
  },
  {
    category: "Soccer",
    name: "FIFA Women's World Cup Winner 2027",
    description: "Winner of the FIFA Women's World Cup.",
    display_order: 40,
    options: [
      "USA", "Spain", "England", "Germany", "Australia", "Sweden",
      "France", "Japan", "Netherlands", "Brazil",
    ],
  },

  // ----------------------------------------------------------- Rugby League
  {
    category: "Rugby League",
    name: "NRL Premier 2027",
    description: "Winner of the NRL Grand Final.",
    display_order: 41,
    options: [
      "Penrith Panthers", "Melbourne Storm", "Brisbane Broncos", "Cronulla Sharks",
      "Sydney Roosters", "Canterbury Bulldogs", "South Sydney Rabbitohs", "Newcastle Knights",
      "Canberra Raiders", "North Queensland Cowboys", "New Zealand Warriors",
      "Parramatta Eels", "Manly Sea Eagles", "Wests Tigers", "Gold Coast Titans",
      "St George Illawarra Dragons",
    ],
  },
  {
    category: "Rugby League",
    name: "Dally M Medallist 2027",
    description: "NRL's official player of the year award.",
    display_order: 42,
    options: [
      "Nathan Cleary", "Reece Walsh", "Kalyn Ponga", "Mitchell Moses",
      "James Tedesco", "Cameron Munster", "Isaah Yeo", "Payne Haas",
    ],
  },
  {
    category: "Rugby League",
    name: "Clive Churchill Medallist 2027",
    description: "Awarded to the player of the match in the NRL Grand Final.",
    display_order: 43,
    options: [
      "Nathan Cleary", "Reece Walsh", "James Tedesco", "Cameron Munster",
      "Isaah Yeo", "Mitchell Moses", "Payne Haas",
    ],
  },
  {
    category: "Rugby League",
    name: "State of Origin Series Winner 2027",
    description: "Winner of the annual State of Origin rugby league series.",
    display_order: 44,
    options: ["New South Wales", "Queensland"],
  },

  // ------------------------------------------------------------ Rugby Union
  {
    category: "Rugby Union",
    name: "Super Rugby Pacific Champion 2027",
    description: "Winner of the Super Rugby Pacific final.",
    display_order: 45,
    options: [
      "Blues", "Chiefs", "Crusaders", "Hurricanes", "Highlanders",
      "Brumbies", "Waratahs", "Reds", "Force", "Fijian Drua", "Moana Pasifika",
    ],
  },
  {
    category: "Rugby Union",
    name: "Rugby Championship Winner 2027",
    description: "Winner of the annual southern hemisphere rugby union championship.",
    display_order: 46,
    options: ["New Zealand", "South Africa", "Australia", "Argentina"],
  },
  {
    category: "Rugby Union",
    name: "Bledisloe Cup Winner 2027",
    description: "Winner of the annual Australia vs New Zealand rugby union series.",
    display_order: 47,
    options: ["New Zealand", "Australia"],
  },
  {
    category: "Rugby Union",
    name: "Rugby World Cup Winner 2027",
    description: "Winner of the Rugby World Cup.",
    display_order: 48,
    options: [
      "New Zealand", "South Africa", "France", "Ireland", "England",
      "Australia", "Argentina", "Wales", "Scotland", "Fiji",
    ],
  },

  // ----------------------------------------------------------------- Tennis
  {
    category: "Tennis",
    name: "Australian Open Men's Champion 2027",
    description: "Winner of the Australian Open men's singles title.",
    display_order: 49,
    options: [
      "Jannik Sinner", "Carlos Alcaraz", "Novak Djokovic", "Alexander Zverev",
      "Daniil Medvedev", "Taylor Fritz", "Casper Ruud", "Alex de Minaur",
    ],
  },
  {
    category: "Tennis",
    name: "Australian Open Women's Champion 2027",
    description: "Winner of the Australian Open women's singles title.",
    display_order: 50,
    options: [
      "Aryna Sabalenka", "Iga Swiatek", "Coco Gauff", "Elena Rybakina",
      "Jasmine Paolini", "Qinwen Zheng", "Jessica Pegula", "Emma Navarro",
    ],
  },
  {
    category: "Tennis",
    name: "French Open Men's Champion 2027",
    description: "Winner of the French Open men's singles title.",
    display_order: 51,
    options: [
      "Carlos Alcaraz", "Jannik Sinner", "Novak Djokovic", "Alexander Zverev",
      "Casper Ruud", "Daniil Medvedev", "Stefanos Tsitsipas",
    ],
  },
  {
    category: "Tennis",
    name: "French Open Women's Champion 2027",
    description: "Winner of the French Open women's singles title.",
    display_order: 52,
    options: [
      "Iga Swiatek", "Aryna Sabalenka", "Coco Gauff", "Elena Rybakina",
      "Jasmine Paolini", "Qinwen Zheng",
    ],
  },
  {
    category: "Tennis",
    name: "Wimbledon Men's Champion 2027",
    description: "Winner of the Wimbledon men's singles title.",
    display_order: 53,
    options: [
      "Carlos Alcaraz", "Jannik Sinner", "Novak Djokovic", "Daniil Medvedev",
      "Alexander Zverev", "Taylor Fritz",
    ],
  },
  {
    category: "Tennis",
    name: "Wimbledon Women's Champion 2027",
    description: "Winner of the Wimbledon women's singles title.",
    display_order: 54,
    options: [
      "Aryna Sabalenka", "Iga Swiatek", "Coco Gauff", "Elena Rybakina", "Jasmine Paolini",
    ],
  },
  {
    category: "Tennis",
    name: "US Open Men's Champion 2027",
    description: "Winner of the US Open men's singles title.",
    display_order: 55,
    options: [
      "Jannik Sinner", "Carlos Alcaraz", "Novak Djokovic", "Alexander Zverev",
      "Daniil Medvedev", "Taylor Fritz",
    ],
  },
  {
    category: "Tennis",
    name: "US Open Women's Champion 2027",
    description: "Winner of the US Open women's singles title.",
    display_order: 56,
    options: [
      "Aryna Sabalenka", "Coco Gauff", "Iga Swiatek", "Elena Rybakina", "Jessica Pegula",
    ],
  },

  // ------------------------------------------------------------------- Golf
  {
    category: "Golf",
    name: "Masters Champion 2027",
    description: "Winner of the Masters Tournament at Augusta National.",
    display_order: 57,
    options: [
      "Scottie Scheffler", "Rory McIlroy", "Jon Rahm", "Xander Schauffele",
      "Bryson DeChambeau", "Ludvig Aberg", "Collin Morikawa", "Viktor Hovland",
    ],
  },
  {
    category: "Golf",
    name: "PGA Championship Winner 2027",
    description: "Winner of the PGA Championship.",
    display_order: 58,
    options: [
      "Scottie Scheffler", "Rory McIlroy", "Xander Schauffele", "Bryson DeChambeau",
      "Jon Rahm", "Viktor Hovland", "Collin Morikawa",
    ],
  },
  {
    category: "Golf",
    name: "US Open Winner 2027",
    description: "Winner of the US Open golf championship.",
    display_order: 59,
    options: [
      "Scottie Scheffler", "Bryson DeChambeau", "Rory McIlroy", "Xander Schauffele",
      "Jon Rahm", "Ludvig Aberg",
    ],
  },
  {
    category: "Golf",
    name: "The Open Champion 2027",
    description: "Winner of The Open Championship (British Open).",
    display_order: 60,
    options: [
      "Scottie Scheffler", "Rory McIlroy", "Xander Schauffele", "Justin Rose",
      "Jon Rahm", "Viktor Hovland",
    ],
  },
  {
    category: "Golf",
    name: "Ryder Cup Winner 2027",
    description: "Winner of the biennial Ryder Cup between the USA and Europe.",
    display_order: 61,
    options: ["USA", "Europe"],
  },

  // ------------------------------------------------------------------ Other
  {
    category: "Other",
    name: "Super Netball Champion 2027",
    description: "Winner of the Suncorp Super Netball Grand Final.",
    display_order: 62,
    options: [
      "NSW Swifts", "Melbourne Vixens", "West Coast Fever", "Adelaide Thunderbirds",
      "Sunshine Coast Lightning", "Queensland Firebirds", "Giants Netball", "Collingwood Magpies",
    ],
  },
  {
    category: "Other",
    name: "Tour de France Winner 2027",
    description: "Winner of the Tour de France general classification.",
    display_order: 63,
    options: [
      "Tadej Pogacar", "Jonas Vingegaard", "Remco Evenepoel", "Primoz Roglic",
      "Egan Bernal", "Juan Ayuso",
    ],
  },
  {
    category: "Other",
    name: "Netball World Cup Winner 2027",
    description: "Winner of the Netball World Cup.",
    display_order: 64,
    options: [
      "Australia", "New Zealand", "England", "Jamaica", "South Africa", "Uganda",
    ],
  },
];

export const EVENT_CATEGORIES: string[] = Array.from(
  new Set(RAT_RACE_EVENTS.map((event) => event.category)),
);

export { OTHER_OPTION } from "@/lib/eventOptions";
