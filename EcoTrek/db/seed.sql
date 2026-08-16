-- Seed data for EcoTrek (run AFTER schema.sql)
-- Badges match the ids already used in src/constants/EcoPointsContext.tsx.

INSERT INTO badges (id, name, description, icon, tier, criteria, sort_order) VALUES
  ('first_hike',   'First Steps',      'Complete your first hike',              '🥾', 1, '{"metric":"hike_activities","gte":1}',  10),
  ('first_bike',   'Wheels Up',        'Complete your first bike ride',         '🚴', 1, '{"metric":"bike_activities","gte":1}',  20),
  ('ten_miles',    'Ten Miler',        'Cover 10 total miles',                  '🏃', 1, '{"metric":"total_miles","gte":10}',     30),
  ('fifty_miles',  'Half Century',     'Cover 50 total miles',                  '🔥', 2, '{"metric":"total_miles","gte":50}',     40),
  ('first_tree',   'Seed Planter',     'Earn your first tree',                  '🌱', 1, '{"metric":"total_trees","gte":1}',      50),
  ('ten_trees',    'Grove Grower',     'Earn 10 trees',                         '🌳', 2, '{"metric":"total_trees","gte":10}',     60),
  ('club_member',  'Team Player',      'Join a club',                           '🤝', 1, '{"metric":"clubs_joined","gte":1}',     70),
  ('week_streak',  'Seven Day Streak', 'Be active 7 days in a row',             '📅', 2, '{"metric":"current_streak","gte":7}',   80),
  ('trail_master', 'Trail Master',     'Complete 5 different trails',           '🗺️', 3, '{"metric":"trail_completions","gte":5}',90)
ON CONFLICT (id) DO NOTHING;

INSERT INTO trails (slug, name, type, distance_miles, difficulty, area, description,
                    rating, pet_friendly, family_friendly, restrooms_available, water_stations,
                    safety_tips, plants, animals, start_lat, start_lng, is_loop, eco_points)
VALUES
  ('lady-bird-lake-hike-and-bike', 'Lady Bird Lake Hike and Bike Trail', 'mixed', 10, 'Easy',
   'Downtown Austin',
   'A scenic trail looping around Lady Bird Lake with skyline views. Good for all skill levels.',
   4.8, TRUE, TRUE, TRUE, TRUE,
   ARRAY['Stay on designated paths to avoid wildlife.','Watch for cyclists if walking or jogging.','Carry water, especially in the heat.'],
   ARRAY['Texas Live Oak','Bald Cypress','Water Hyacinth'],
   ARRAY['Great Blue Heron','Turtles','Mexican Free-tailed Bat'],
   30.2620, -97.7500, TRUE, 10),
  ('barton-creek-greenbelt', 'Barton Creek Greenbelt', 'hike', 7.9, 'Moderate',
   'South Austin',
   'Rocky creekside trail with swimming holes and limestone cliffs.',
   4.7, TRUE, FALSE, FALSE, FALSE,
   ARRAY['Rocks get slick when wet.','Bring more water than you think you need.','Cell service is spotty in the canyon.'],
   ARRAY['Cedar Elm','Ashe Juniper','Texas Persimmon'],
   ARRAY['White-tailed Deer','Barred Owl','Green Anole'],
   30.2447, -97.8003, FALSE, 15),
  ('walnut-creek-trail', 'Walnut Creek Metropolitan Park Trail', 'mixed', 15, 'Moderate',
   'North Austin',
   'Shaded singletrack and paved paths through Walnut Creek Park.',
   4.5, TRUE, TRUE, TRUE, TRUE,
   ARRAY['Yield to bikes on singletrack.','Watch for poison ivy off-trail.'],
   ARRAY['Post Oak','Yaupon Holly'], ARRAY['Fox Squirrel','Armadillo'],
   30.3921, -97.6890, FALSE, 12)
ON CONFLICT (slug) DO NOTHING;

-- Example weekly challenge
INSERT INTO challenges (slug, title, description, period, metric, target_value, reward_points, ends_at)
VALUES ('weekly-3-miles', 'Log 3 miles this week', 'Hike or bike 3 total miles before Sunday night.',
        'weekly', 'miles', 3, 30, date_trunc('week', now()) + interval '7 days')
ON CONFLICT (slug) DO NOTHING;
