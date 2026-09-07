-- Replace five 2027 events with the requested college football and soccer events.
--
-- Predictions for removed events are deleted by the existing
-- `predictions.event_id references events(id) on delete cascade` constraint.
delete from public.events
where name in (
  'Clive Churchill Medallist 2027',
  'State of Origin Series Winner 2027',
  'Rugby Championship Winner 2027',
  'Bledisloe Cup Winner 2027',
  'Ryder Cup Winner 2027'
);

insert into public.events (category, name, description, options, display_order) values
  (
    'College Football',
    'Heisman Trophy',
    'Awarded to the most outstanding player in college football.',
    '["Arch Manning","Jeremiah Smith","Julian Sayin","DJ Lagway","Nico Iamaleava","Dante Moore","LaNorris Sellers","Cade Klubnik","Garrett Nussmeier","Drew Allar","Jackson Arnold","Avery Johnson","Carson Beck","Austin Simmons","Elijah Brown","Bryce Underwood","Ryan Williams","Carnell Tate","Zachariah Branch","Jordyn Tyson","Makai Lemon","Justice Haynes","Jeremiyah Love","Nicholas Singleton","Kaytron Allen","Rueben Owens","CJ Baxter","Dylan Raiola","Devon Dampier","John Mateer"]'::jsonb,
    25
  ),
  (
    'Soccer',
    'Serie A Champion',
    'Winner of Italy''s Serie A.',
    '["Inter Milan","Napoli","Juventus","AC Milan","Atalanta","Roma","Lazio","Fiorentina","Bologna","Torino","Genoa","Monza","Udinese","Sassuolo","Parma","Como","Cagliari","Verona","Lecce","Empoli","Palermo","Sampdoria","Bari","Venezia","Cremonese","Modena","Pisa","Spezia","Catanzaro","Frosinone"]'::jsonb,
    36
  ),
  (
    'Soccer',
    'La Liga Champion',
    'Winner of Spain''s La Liga.',
    '["Real Madrid","Barcelona","Atletico Madrid","Athletic Bilbao","Villarreal","Real Sociedad","Real Betis","Sevilla","Valencia","Celta Vigo","Osasuna","Getafe","Rayo Vallecano","Mallorca","Girona","Espanyol","Alaves","Las Palmas","Levante","Elche","Granada","Real Valladolid","Leganes","Cadiz","Deportivo La Coruna","Real Zaragoza","Eibar","Sporting Gijon","Racing Santander","Malaga"]'::jsonb,
    37
  )
on conflict (name) do update
set category = excluded.category,
    description = excluded.description,
    options = excluded.options,
    display_order = excluded.display_order;

with ordered_events(name, display_order) as (
  values
    ('AFL Minor Premier 2027', 1),
    ('AFL Premier 2027', 2),
    ('Brownlow Medallist 2027', 3),
    ('AFLCA Champion Player of the Year 2027', 4),
    ('Coleman Medallist 2027', 5),
    ('Rising Star Winner 2027', 6),
    ('AFLW Premier 2027', 7),
    ('AFLW Best & Fairest 2027', 8),
    ('WAFL Premier 2027', 9),
    ('Sandover Medallist 2027', 10),
    ('BBL Champion 2026-27', 11),
    ('BBL Top Runscorer 2026-27', 12),
    ('BBL Leading Wicket Taker 2026-27', 13),
    ('Sheffield Shield Winner 2026-27', 14),
    ('Marsh One-Day Cup Winner 2026-27', 15),
    ('Allan Border Medallist 2027', 16),
    ('ICC Men''s Cricket World Cup Winner 2027', 17),
    ('AFC Champion (2026 Season)', 18),
    ('NFC Champion (2026 Season)', 19),
    ('Super Bowl LXI Winner', 20),
    ('NFL MVP 2026', 21),
    ('Offensive Player of the Year', 22),
    ('Defensive Player of the Year', 23),
    ('College Football Playoff Champion', 24),
    ('Heisman Trophy', 25),
    ('NBL Champion 2026-27', 26),
    ('NBL MVP 2026-27', 27),
    ('NBA Eastern Conference Champion 2027', 28),
    ('NBA Western Conference Champion 2027', 29),
    ('NBA Champion 2027', 30),
    ('NBA MVP 2026-27', 31),
    ('March Madness Champion 2027', 32),
    ('World Series Champion 2027', 33),
    ('Stanley Cup Champion 2027', 34),
    ('EPL Champion 2026-27', 35),
    ('Serie A Champion', 36),
    ('La Liga Champion', 37),
    ('FA Cup Winner 2027', 38),
    ('UEFA Champions League Winner 2027', 39),
    ('UEFA Europa League Winner 2027', 40),
    ('A-League Champion 2026-27', 41),
    ('Ballon d''Or 2027', 42),
    ('FIFA Women''s World Cup Winner 2027', 43),
    ('NRL Premier 2027', 44),
    ('Dally M Medallist 2027', 45),
    ('Super Rugby Pacific Champion 2027', 46),
    ('Rugby World Cup Winner 2027', 47),
    ('Australian Open Men''s Champion 2027', 48),
    ('Australian Open Women''s Champion 2027', 49),
    ('French Open Men''s Champion 2027', 50),
    ('French Open Women''s Champion 2027', 51),
    ('Wimbledon Men''s Champion 2027', 52),
    ('Wimbledon Women''s Champion 2027', 53),
    ('US Open Men''s Champion 2027', 54),
    ('US Open Women''s Champion 2027', 55),
    ('Masters Champion 2027', 56),
    ('PGA Championship Winner 2027', 57),
    ('US Open Winner 2027', 58),
    ('The Open Champion 2027', 59),
    ('Super Netball Champion 2027', 60),
    ('Tour de France Winner 2027', 61),
    ('Netball World Cup Winner 2027', 62)
)
update public.events
set display_order = ordered_events.display_order
from ordered_events
where public.events.name = ordered_events.name;
