-- Seed data for EcoTrek (run AFTER schema.sql)
-- Badge ids and icon names match src/constants/EcoPointsContext.tsx exactly,
-- so the app and the database never disagree about what a badge is.

INSERT INTO badges (id, name, description, icon, tier, criteria, sort_order) VALUES
  ('first_hike',          'First Steps',      'Complete your first hike',            'boot',        1, '{"metric":"hikes","gte":1}',              10),
  ('first_ride',          'Wheels Up',        'Complete your first bike ride',       'bike',        1, '{"metric":"rides","gte":1}',              20),
  ('first_tree',          'Seed Planter',     'Earn your first tree',                'leaf',        1, '{"metric":"total_trees","gte":1}',        30),
  ('five_miles',          'Five Miler',       'Cover 5 total miles',                 'activity',    1, '{"metric":"total_miles","gte":5}',        40),
  ('twenty_five_miles',   'Distance Runner',  'Cover 25 total miles',                'trending-up', 2, '{"metric":"total_miles","gte":25}',       50),
  ('hundred_miles',       'Century Trekker',  'Cover 100 total miles',               'award',       3, '{"metric":"total_miles","gte":100}',      60),
  ('ten_trees',           'Mini Forest',      'Earn 10 trees',                       'tree',        2, '{"metric":"total_trees","gte":10}',       70),
  ('fifty_trees',         'Grove Keeper',     'Earn 50 trees',                       'tree',        3, '{"metric":"total_trees","gte":50}',       80),
  ('streak_3',            'Warming Up',       'Reach a 3-day streak',                'flame',       1, '{"metric":"longest_streak","gte":3}',     90),
  ('streak_7',            'Seven Straight',   'Reach a 7-day streak',                'flame',       2, '{"metric":"longest_streak","gte":7}',    100),
  ('streak_30',           'Unbroken',         'Reach a 30-day streak',               'flame',       3, '{"metric":"longest_streak","gte":30}',   110),
  ('first_challenge',     'Challenger',       'Finish your first weekly challenge',  'target',      1, '{"metric":"challenges","gte":1}',        120),
  ('ten_challenges',      'Habit Builder',    'Finish 10 challenges',                'target',      2, '{"metric":"challenges","gte":10}',       130),
  ('first_trail',         'Trail Bagger',     'Complete a full named trail',         'map',         1, '{"metric":"trail_completions","gte":1}', 140),
  ('five_trails',         'Trail Master',     'Complete 5 different trails',         'flag',        3, '{"metric":"trail_completions","gte":5}', 150),
  ('five_hundred_points', 'Point Collector',  'Earn 500 EcoPoints',                  'star',        2, '{"metric":"total_points","gte":500}',    160),
  ('thousand_points',     'EcoElite',         'Earn 1,000 EcoPoints',                'star',        3, '{"metric":"total_points","gte":1000}',   170),
  ('trail_steward',       'Trail Steward',    'Reach the Trail Steward level',       'shield',      2, '{"metric":"level_index","gte":4}',       180),
  ('eco_champion',        'EcoChampion',      'Reach the EcoChampion level',         'crown',       3, '{"metric":"level_index","gte":7}',       190),
  ('club_member',         'Team Player',      'Join a club',                         'users',       1, '{"metric":"clubs_joined","gte":1}',      200),
  ('club_founder',        'Club Founder',     'Create a club',                       'crown',       2, '{"metric":"clubs_founded","gte":1}',     210)
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
