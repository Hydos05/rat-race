-- Rat Race initial schema
-- Run this against your Supabase project (SQL editor or `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- users ---
-- Mirrors auth.users so we can store extra profile info and safely join
-- against it from RLS policies / the leaderboard view.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can view all profiles"
  on public.users for select
  using (true);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- Automatically create a `public.users` row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------- events ---
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null unique,
  description text,
  options jsonb not null default '[]'::jsonb,
  correct_answer text,
  points_pool integer not null default 100,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  locked boolean not null default false
);

alter table public.events enable row level security;

create policy "Anyone can view events"
  on public.events for select
  using (true);

-- No insert/update/delete policies are defined for `events`: all writes go
-- through the service role key from the admin API routes.

-- ----------------------------------------------------------- predictions --
-- Single source of truth for the submission deadline used by RLS policies
-- below. IMPORTANT: this must be kept in sync with `SUBMISSION_DEADLINE` in
-- src/lib/constants.ts (Postgres RLS policies can't read application
-- constants, so the value is duplicated here).
create or replace function public.submission_deadline()
returns timestamptz
language sql
immutable
as $$
  select timestamptz '2026-09-20 23:59:59+10';
$$;

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  selected_option text not null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id)
);

alter table public.predictions enable row level security;

create policy "Users can view their own predictions"
  on public.predictions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own predictions before the deadline"
  on public.predictions for insert
  with check (
    auth.uid() = user_id
    and now() < public.submission_deadline()
    and not exists (
      select 1 from public.events
      where events.id = event_id and events.locked = true
    )
  );

create policy "Users can update their own predictions before the deadline"
  on public.predictions for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and now() < public.submission_deadline()
    and not exists (
      select 1 from public.events
      where events.id = event_id and events.locked = true
    )
  );

-- ------------------------------------------------------------ leaderboard -
create table if not exists public.leaderboard (
  user_id uuid primary key references public.users (id) on delete cascade,
  total_points numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.leaderboard enable row level security;

create policy "Anyone can view the leaderboard"
  on public.leaderboard for select
  using (true);

-- No insert/update/delete policies are defined for `leaderboard`: it is
-- only ever written to by the admin recalculation API using the service
-- role key.

-- Enable realtime updates for the live leaderboard.
alter publication supabase_realtime add table public.leaderboard;

-- ------------------------------------------------------------- seed data --
-- 64 Rat Race events across AFL, Cricket, American Football, Basketball,
-- Baseball, Ice Hockey, Soccer, Rugby League, Rugby Union, Tennis, Golf and
-- Other categories. Generated from src/data/events.ts.
insert into public.events (category, name, description, options, display_order) values
  ('AFL', 'AFL Minor Premier 2027', 'Team finishing top of the ladder after the home & away season.', '["Collingwood","Brisbane Lions","Sydney Swans","Geelong Cats","Port Adelaide","Carlton","Western Bulldogs","GWS Giants","Gold Coast Suns","Adelaide Crows","Melbourne","Fremantle","St Kilda","Hawthorn","Essendon","West Coast Eagles","North Melbourne","Richmond","Footscray","Sydney"]'::jsonb, 1),
  ('AFL', 'AFL Premier 2027', 'Winner of the AFL Grand Final.', '["Collingwood","Brisbane Lions","Sydney Swans","Geelong Cats","Port Adelaide","Carlton","Western Bulldogs","GWS Giants","Gold Coast Suns","Adelaide Crows","Melbourne","Fremantle","St Kilda","Hawthorn","Essendon","West Coast Eagles","North Melbourne","Richmond"]'::jsonb, 2),
  ('AFL', 'Brownlow Medallist 2027', 'AFL''s official award for the fairest and best player of the season.', '["Nick Daicos","Marcus Bontempelli","Lachie Neale","Patrick Cripps","Zach Merrett","Andrew Brayshaw","Jordan Dawson","Errol Gulden","Christian Petracca","Touk Miller","Rowan Marshall","Tom Green","Matt Rowell","Caleb Serong","Clayton Oliver"]'::jsonb, 3),
  ('AFL', 'AFLCA Champion Player of the Year 2027', 'Awarded by AFL coaches to the season''s best player.', '["Nick Daicos","Marcus Bontempelli","Lachie Neale","Patrick Cripps","Zach Merrett","Andrew Brayshaw","Jordan Dawson","Errol Gulden","Christian Petracca","Touk Miller"]'::jsonb, 4),
  ('AFL', 'Coleman Medallist 2027', 'Awarded to the AFL season''s leading goal-kicker.', '["Charlie Curnow","Jamie Elliott","Harry McKay","Ben King","Jack Riewoldt","Tom Hawkins","Aaron Naughton","Sam Darcy","Jesse Hogan","Mitch Georgiades"]'::jsonb, 5),
  ('AFL', 'Rising Star Winner 2027', 'Awarded to the AFL''s best first or second year player.', '["Harley Reid","Nick Watson","Zane Duursma","Jed Walter","Sam Lalor","Josh Rachele","Colby McKercher"]'::jsonb, 6),
  ('AFL', 'AFLW Premier 2027', 'Winner of the AFLW Grand Final.', '["North Melbourne","Brisbane Lions","Adelaide Crows","Melbourne","Port Adelaide","Fremantle","Collingwood","Carlton","Geelong Cats","Western Bulldogs"]'::jsonb, 7),
  ('AFL', 'AFLW Best & Fairest 2027', 'AFLW''s official award for the fairest and best player of the season.', '["Ash Riddell","Kate Surman","Aisling Utri","Alyssa Bannan","Daisy Pearce","Erin Phillips","Jasmine Garner","Charlie Rowbottom"]'::jsonb, 8),
  ('AFL', 'WAFL Premier 2027', 'Winner of the WAFL Grand Final.', '["South Fremantle","East Fremantle","Subiaco","West Perth","Claremont","East Perth","Swan Districts","Perth","Peel Thunder"]'::jsonb, 9),
  ('AFL', 'Sandover Medallist 2027', 'Awarded to the WAFL''s fairest and best player.', '["Player from South Fremantle","Player from East Fremantle","Player from Subiaco","Player from West Perth","Player from Claremont","Player from East Perth","Player from Swan Districts","Player from Perth","Player from Peel Thunder"]'::jsonb, 10),
  ('Cricket', 'BBL Champion 2026-27', 'Winner of the Big Bash League final.', '["Sydney Sixers","Perth Scorchers","Brisbane Heat","Melbourne Stars","Melbourne Renegades","Adelaide Strikers","Sydney Thunder","Hobart Hurricanes"]'::jsonb, 11),
  ('Cricket', 'BBL Top Runscorer 2026-27', 'Leading run-scorer of the Big Bash League season.', '["Josh Philippe","Jake Fraser-McGurk","Matthew Short","Marcus Stoinis","Colin Munro","David Warner","Travis Head","Cameron Bancroft"]'::jsonb, 12),
  ('Cricket', 'BBL Leading Wicket Taker 2026-27', 'Leading wicket-taker of the Big Bash League season.', '["Adam Zampa","Andrew Tye","Xavier Bartlett","Nathan Ellis","Riley Meredith","Spencer Johnson","Wes Agar"]'::jsonb, 13),
  ('Cricket', 'Sheffield Shield Winner 2026-27', 'Winner of Australia''s first-class domestic cricket competition.', '["New South Wales","Victoria","Queensland","Western Australia","South Australia","Tasmania"]'::jsonb, 14),
  ('Cricket', 'Marsh One-Day Cup Winner 2026-27', 'Winner of Australia''s domestic one-day cricket competition.', '["New South Wales","Victoria","Queensland","Western Australia","South Australia","Tasmania"]'::jsonb, 15),
  ('Cricket', 'Allan Border Medallist 2027', 'Cricket Australia''s award for Australia''s player of the year.', '["Pat Cummins","Steve Smith","Travis Head","Mitchell Starc","Josh Hazlewood","Marnus Labuschagne","Alex Carey","Beth Mooney","Ellyse Perry","Annabel Sutherland"]'::jsonb, 16),
  ('Cricket', 'ICC Men''s Cricket World Cup Winner 2027', 'Winner of the ICC Men''s Cricket World Cup.', '["Australia","India","England","South Africa","New Zealand","Pakistan","Sri Lanka","West Indies","Bangladesh","Afghanistan"]'::jsonb, 17),
  ('American Football', 'AFC Champion (2026 Season)', 'Winner of the AFC Championship, advancing to the Super Bowl.', '["Kansas City Chiefs","Buffalo Bills","Baltimore Ravens","Cincinnati Bengals","Houston Texans","Miami Dolphins","Pittsburgh Steelers","Los Angeles Chargers","Cleveland Browns","Denver Broncos","Jacksonville Jaguars","Indianapolis Colts","Tennessee Titans","New York Jets","Las Vegas Raiders","New England Patriots"]'::jsonb, 18),
  ('American Football', 'NFC Champion (2026 Season)', 'Winner of the NFC Championship, advancing to the Super Bowl.', '["San Francisco 49ers","Philadelphia Eagles","Dallas Cowboys","Detroit Lions","Green Bay Packers","Tampa Bay Buccaneers","Los Angeles Rams","Minnesota Vikings","Atlanta Falcons","New Orleans Saints","Seattle Seahawks","Chicago Bears","Washington Commanders","New York Giants","Arizona Cardinals","Carolina Panthers"]'::jsonb, 19),
  ('American Football', 'Super Bowl LXI Winner', 'Winner of Super Bowl LXI.', '["Kansas City Chiefs","Buffalo Bills","Baltimore Ravens","San Francisco 49ers","Philadelphia Eagles","Dallas Cowboys","Detroit Lions","Green Bay Packers","Houston Texans","Miami Dolphins","Tampa Bay Buccaneers","Los Angeles Rams"]'::jsonb, 20),
  ('American Football', 'NFL MVP 2026', 'NFL''s Most Valuable Player award for the 2026 season.', '["Patrick Mahomes","Josh Allen","Lamar Jackson","Jalen Hurts","Joe Burrow","C.J. Stroud","Justin Herbert","Jayden Daniels","Christian McCaffrey","Tyreek Hill"]'::jsonb, 21),
  ('American Football', 'Offensive Player of the Year', 'NFL''s Offensive Player of the Year award.', '["Patrick Mahomes","Josh Allen","Christian McCaffrey","Tyreek Hill","CeeDee Lamb","Jalen Hurts","Joe Burrow","Amon-Ra St. Brown","Saquon Barkley"]'::jsonb, 22),
  ('American Football', 'Defensive Player of the Year', 'NFL''s Defensive Player of the Year award.', '["Myles Garrett","T.J. Watt","Micah Parsons","Aidan Hutchinson","Maxx Crosby","Fred Warner","Roquan Smith","Antoine Winfield Jr."]'::jsonb, 23),
  ('American Football', 'College Football Playoff Champion', 'Winner of the College Football Playoff National Championship.', '["Georgia","Ohio State","Michigan","Alabama","Texas","Oregon","Notre Dame","Penn State","Clemson","LSU","Florida State","USC"]'::jsonb, 24),
  ('Basketball', 'NBL Champion 2026-27', 'Winner of the National Basketball League (Australia) championship series.', '["Melbourne United","Perth Wildcats","New Zealand Breakers","Tasmania JackJumpers","Sydney Kings","Illawarra Hawks","Adelaide 36ers","Brisbane Bullets","South East Melbourne Phoenix","Cairns Taipans"]'::jsonb, 25),
  ('Basketball', 'NBL MVP 2026-27', 'NBL''s Most Valuable Player award.', '["Bryce Cotton","Jack McVeigh","Sunday Dech","Will Magnay","DJ Hogg","Xavier Cooks","Josh Giddey"]'::jsonb, 26),
  ('Basketball', 'NBA Eastern Conference Champion 2027', 'Winner of the NBA Eastern Conference Finals.', '["Boston Celtics","New York Knicks","Milwaukee Bucks","Cleveland Cavaliers","Indiana Pacers","Orlando Magic","Philadelphia 76ers","Miami Heat","Atlanta Hawks"]'::jsonb, 27),
  ('Basketball', 'NBA Western Conference Champion 2027', 'Winner of the NBA Western Conference Finals.', '["Denver Nuggets","Oklahoma City Thunder","Minnesota Timberwolves","Dallas Mavericks","Los Angeles Lakers","Phoenix Suns","Golden State Warriors","Memphis Grizzlies","Sacramento Kings","Houston Rockets"]'::jsonb, 28),
  ('Basketball', 'NBA Champion 2027', 'Winner of the NBA Finals.', '["Boston Celtics","Denver Nuggets","Oklahoma City Thunder","New York Knicks","Minnesota Timberwolves","Milwaukee Bucks","Dallas Mavericks","Los Angeles Lakers","Cleveland Cavaliers","Phoenix Suns"]'::jsonb, 29),
  ('Basketball', 'NBA MVP 2026-27', 'NBA''s Most Valuable Player award.', '["Nikola Jokic","Shai Gilgeous-Alexander","Luka Doncic","Giannis Antetokounmpo","Jayson Tatum","Anthony Edwards","Victor Wembanyama","Joel Embiid"]'::jsonb, 30),
  ('Basketball', 'March Madness Champion 2027', 'Winner of the NCAA Men''s Division I Basketball Tournament.', '["Duke","Kansas","Kentucky","UConn","North Carolina","Houston","Purdue","Auburn","Arizona","Gonzaga","Alabama","Tennessee"]'::jsonb, 31),
  ('Baseball', 'World Series Champion 2027', 'Winner of Major League Baseball''s World Series.', '["Los Angeles Dodgers","New York Yankees","Atlanta Braves","Houston Astros","Philadelphia Phillies","Baltimore Orioles","Texas Rangers","San Diego Padres","New York Mets","Cleveland Guardians"]'::jsonb, 32),
  ('Ice Hockey', 'Stanley Cup Champion 2027', 'Winner of the NHL''s Stanley Cup Finals.', '["Florida Panthers","Edmonton Oilers","Dallas Stars","Colorado Avalanche","New York Rangers","Vegas Golden Knights","Toronto Maple Leafs","Boston Bruins","Carolina Hurricanes","Winnipeg Jets"]'::jsonb, 33),
  ('Soccer', 'EPL Champion 2026-27', 'Winner of the English Premier League.', '["Manchester City","Arsenal","Liverpool","Chelsea","Manchester United","Tottenham Hotspur","Newcastle United","Aston Villa","Brighton","West Ham United"]'::jsonb, 34),
  ('Soccer', 'FA Cup Winner 2027', 'Winner of the English FA Cup.', '["Manchester City","Arsenal","Liverpool","Chelsea","Manchester United","Tottenham Hotspur","Newcastle United","Aston Villa"]'::jsonb, 35),
  ('Soccer', 'UEFA Champions League Winner 2027', 'Winner of the UEFA Champions League.', '["Real Madrid","Manchester City","Bayern Munich","Paris Saint-Germain","Liverpool","Barcelona","Arsenal","Inter Milan","Atletico Madrid","Borussia Dortmund","AC Milan","Juventus"]'::jsonb, 36),
  ('Soccer', 'UEFA Europa League Winner 2027', 'Winner of the UEFA Europa League.', '["Tottenham Hotspur","Ajax","AS Roma","Sevilla","Atalanta","Bayer Leverkusen","Rangers","Fiorentina"]'::jsonb, 37),
  ('Soccer', 'A-League Champion 2026-27', 'Winner of the A-League Men''s Grand Final.', '["Melbourne City","Melbourne Victory","Sydney FC","Central Coast Mariners","Western Sydney Wanderers","Wellington Phoenix","Adelaide United","Perth Glory","Macarthur FC","Brisbane Roar"]'::jsonb, 38),
  ('Soccer', 'Ballon d''Or 2027', 'Awarded to the world''s best male soccer player.', '["Vinicius Jr","Jude Bellingham","Kylian Mbappe","Erling Haaland","Rodri","Lamine Yamal","Bukayo Saka","Dani Carvajal"]'::jsonb, 39),
  ('Soccer', 'FIFA Women''s World Cup Winner 2027', 'Winner of the FIFA Women''s World Cup.', '["USA","Spain","England","Germany","Australia","Sweden","France","Japan","Netherlands","Brazil"]'::jsonb, 40),
  ('Rugby League', 'NRL Premier 2027', 'Winner of the NRL Grand Final.', '["Penrith Panthers","Melbourne Storm","Brisbane Broncos","Cronulla Sharks","Sydney Roosters","Canterbury Bulldogs","South Sydney Rabbitohs","Newcastle Knights","Canberra Raiders","North Queensland Cowboys","New Zealand Warriors","Parramatta Eels","Manly Sea Eagles","Wests Tigers","Gold Coast Titans","St George Illawarra Dragons"]'::jsonb, 41),
  ('Rugby League', 'Dally M Medallist 2027', 'NRL''s official player of the year award.', '["Nathan Cleary","Reece Walsh","Kalyn Ponga","Mitchell Moses","James Tedesco","Cameron Munster","Isaah Yeo","Payne Haas"]'::jsonb, 42),
  ('Rugby League', 'Clive Churchill Medallist 2027', 'Awarded to the player of the match in the NRL Grand Final.', '["Nathan Cleary","Reece Walsh","James Tedesco","Cameron Munster","Isaah Yeo","Mitchell Moses","Payne Haas"]'::jsonb, 43),
  ('Rugby League', 'State of Origin Series Winner 2027', 'Winner of the annual State of Origin rugby league series.', '["New South Wales","Queensland"]'::jsonb, 44),
  ('Rugby Union', 'Super Rugby Pacific Champion 2027', 'Winner of the Super Rugby Pacific final.', '["Blues","Chiefs","Crusaders","Hurricanes","Highlanders","Brumbies","Waratahs","Reds","Force","Fijian Drua","Moana Pasifika"]'::jsonb, 45),
  ('Rugby Union', 'Rugby Championship Winner 2027', 'Winner of the annual southern hemisphere rugby union championship.', '["New Zealand","South Africa","Australia","Argentina"]'::jsonb, 46),
  ('Rugby Union', 'Bledisloe Cup Winner 2027', 'Winner of the annual Australia vs New Zealand rugby union series.', '["New Zealand","Australia"]'::jsonb, 47),
  ('Rugby Union', 'Rugby World Cup Winner 2027', 'Winner of the Rugby World Cup.', '["New Zealand","South Africa","France","Ireland","England","Australia","Argentina","Wales","Scotland","Fiji"]'::jsonb, 48),
  ('Tennis', 'Australian Open Men''s Champion 2027', 'Winner of the Australian Open men''s singles title.', '["Jannik Sinner","Carlos Alcaraz","Novak Djokovic","Alexander Zverev","Daniil Medvedev","Taylor Fritz","Casper Ruud","Alex de Minaur"]'::jsonb, 49),
  ('Tennis', 'Australian Open Women''s Champion 2027', 'Winner of the Australian Open women''s singles title.', '["Aryna Sabalenka","Iga Swiatek","Coco Gauff","Elena Rybakina","Jasmine Paolini","Qinwen Zheng","Jessica Pegula","Emma Navarro"]'::jsonb, 50),
  ('Tennis', 'French Open Men''s Champion 2027', 'Winner of the French Open men''s singles title.', '["Carlos Alcaraz","Jannik Sinner","Novak Djokovic","Alexander Zverev","Casper Ruud","Daniil Medvedev","Stefanos Tsitsipas"]'::jsonb, 51),
  ('Tennis', 'French Open Women''s Champion 2027', 'Winner of the French Open women''s singles title.', '["Iga Swiatek","Aryna Sabalenka","Coco Gauff","Elena Rybakina","Jasmine Paolini","Qinwen Zheng"]'::jsonb, 52),
  ('Tennis', 'Wimbledon Men''s Champion 2027', 'Winner of the Wimbledon men''s singles title.', '["Carlos Alcaraz","Jannik Sinner","Novak Djokovic","Daniil Medvedev","Alexander Zverev","Taylor Fritz"]'::jsonb, 53),
  ('Tennis', 'Wimbledon Women''s Champion 2027', 'Winner of the Wimbledon women''s singles title.', '["Aryna Sabalenka","Iga Swiatek","Coco Gauff","Elena Rybakina","Jasmine Paolini"]'::jsonb, 54),
  ('Tennis', 'US Open Men''s Champion 2027', 'Winner of the US Open men''s singles title.', '["Jannik Sinner","Carlos Alcaraz","Novak Djokovic","Alexander Zverev","Daniil Medvedev","Taylor Fritz"]'::jsonb, 55),
  ('Tennis', 'US Open Women''s Champion 2027', 'Winner of the US Open women''s singles title.', '["Aryna Sabalenka","Coco Gauff","Iga Swiatek","Elena Rybakina","Jessica Pegula"]'::jsonb, 56),
  ('Golf', 'Masters Champion 2027', 'Winner of the Masters Tournament at Augusta National.', '["Scottie Scheffler","Rory McIlroy","Jon Rahm","Xander Schauffele","Bryson DeChambeau","Ludvig Aberg","Collin Morikawa","Viktor Hovland"]'::jsonb, 57),
  ('Golf', 'PGA Championship Winner 2027', 'Winner of the PGA Championship.', '["Scottie Scheffler","Rory McIlroy","Xander Schauffele","Bryson DeChambeau","Jon Rahm","Viktor Hovland","Collin Morikawa"]'::jsonb, 58),
  ('Golf', 'US Open Winner 2027', 'Winner of the US Open golf championship.', '["Scottie Scheffler","Bryson DeChambeau","Rory McIlroy","Xander Schauffele","Jon Rahm","Ludvig Aberg"]'::jsonb, 59),
  ('Golf', 'The Open Champion 2027', 'Winner of The Open Championship (British Open).', '["Scottie Scheffler","Rory McIlroy","Xander Schauffele","Justin Rose","Jon Rahm","Viktor Hovland"]'::jsonb, 60),
  ('Golf', 'Ryder Cup Winner 2027', 'Winner of the biennial Ryder Cup between the USA and Europe.', '["USA","Europe"]'::jsonb, 61),
  ('Other', 'Super Netball Champion 2027', 'Winner of the Suncorp Super Netball Grand Final.', '["NSW Swifts","Melbourne Vixens","West Coast Fever","Adelaide Thunderbirds","Sunshine Coast Lightning","Queensland Firebirds","Giants Netball","Collingwood Magpies"]'::jsonb, 62),
  ('Other', 'Tour de France Winner 2027', 'Winner of the Tour de France general classification.', '["Tadej Pogacar","Jonas Vingegaard","Remco Evenepoel","Primoz Roglic","Egan Bernal","Juan Ayuso"]'::jsonb, 63),
  ('Other', 'Netball World Cup Winner 2027', 'Winner of the Netball World Cup.', '["Australia","New Zealand","England","Jamaica","South Africa","Uganda"]'::jsonb, 64)
on conflict (name) do nothing;
