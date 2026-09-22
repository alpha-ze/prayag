import { getSupabasePool } from './supabase';
import bcrypt from 'bcryptjs';

const seedDatabase = async () => {
  console.log('🌱 Seeding Supabase database...');
  
  const pool = getSupabasePool();

  // Clear existing data (in correct order to handle foreign keys)
  await pool.query('DELETE FROM game_actions');
  await pool.query('DELETE FROM game_sessions');
  await pool.query('DELETE FROM leaderboard_entries');
  await pool.query('DELETE FROM promptle_challenges');
  await pool.query('DELETE FROM survival_scenarios');
  await pool.query('DELETE FROM users');

  console.log('🗑️  Cleared existing data');

  // Seed users
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const userPasswordHash = await bcrypt.hash('participant123', 10);

  // Insert admin user
  const adminResult = await pool.query(
    'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id',
    ['admin@promptx.com', adminPasswordHash, 'Admin User', 'admin']
  );

  // Insert test participant
  await pool.query(
    'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
    ['player@example.com', userPasswordHash, 'Test Player', 'participant']
  );

  // Add more test users for testing
  for (let i = 1; i <= 10; i++) {
    await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
      [`player${i}@test.com`, userPasswordHash, `Test Player ${i}`, 'participant']
    );
  }

  console.log('✅ Users seeded (12 total: 1 admin, 11 participants)');

  // Seed Promptle challenges
  const promptleChallenges = [
    {
      title: 'Space Explorer',
      description: 'Identify objects and concepts related to space exploration',
      difficulty: 'easy',
      category: 'space',
      image_url: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800',
      keywords: ['astronaut', 'helmet', 'space', 'suit'],
      aliases: {
        'astronaut': ['spaceman', 'cosmonaut'],
        'helmet': ['headgear', 'protection'],
        'space': ['cosmos', 'universe'],
        'suit': ['spacesuit', 'gear']
      },
      hints: [
        'This person travels to space',
        'They wear protective gear on their head',
        'They explore the cosmos in special clothing'
      ],
      time_limit: 300,
      max_guesses: 8,
      base_score: 100
    },
    {
      title: 'Mountain Lake Serenity',
      description: 'Discover the wonders of the natural world',
      difficulty: 'medium',
      category: 'nature',
      image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
      keywords: ['mountain', 'lake', 'reflection', 'forest'],
      aliases: {
        'mountain': ['peak', 'summit', 'hill'],
        'lake': ['water', 'pond'],
        'reflection': ['mirror', 'image'],
        'forest': ['woods', 'trees']
      },
      hints: [
        'A large landform that rises high above the surroundings',
        'A body of still water surrounded by land',
        'What you see when looking at yourself in still water'
      ],
      time_limit: 240,
      max_guesses: 6,
      base_score: 150
    },
    {
      title: 'City Lights at Night',
      description: 'Urban landscape illuminated after dark',
      difficulty: 'hard',
      category: 'urban',
      image_url: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1f?w=800',
      keywords: ['city', 'lights', 'buildings', 'skyline'],
      aliases: {
        'city': ['urban', 'metropolis', 'downtown'],
        'lights': ['illumination', 'glow'],
        'buildings': ['structures', 'towers'],
        'skyline': ['horizon', 'silhouette']
      },
      hints: [
        'An urban area with many people and buildings',
        'What illuminates the darkness',
        'The outline of structures against the sky'
      ],
      time_limit: 180,
      max_guesses: 5,
      base_score: 200
    },
    {
      title: 'Ocean Waves',
      description: 'The power and beauty of the sea',
      difficulty: 'easy',
      category: 'nature',
      image_url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800',
      keywords: ['ocean', 'waves', 'water', 'blue'],
      aliases: {
        'ocean': ['sea', 'water'],
        'waves': ['surf', 'breakers'],
        'water': ['h2o', 'liquid'],
        'blue': ['azure', 'cerulean']
      },
      hints: [
        'A large body of salt water',
        'Water moving up and down rhythmically',
        'The color of the sky and deep water'
      ],
      time_limit: 300,
      max_guesses: 10,
      base_score: 80
    },
    {
      title: 'Technology Circuit',
      description: 'The intricate world of electronic components',
      difficulty: 'expert',
      category: 'technology',
      image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800',
      keywords: ['circuit', 'board', 'electronic', 'technology'],
      aliases: {
        'circuit': ['pcb', 'board'],
        'board': ['motherboard', 'panel'],
        'electronic': ['digital', 'tech'],
        'technology': ['tech', 'computing']
      },
      hints: [
        'An electronic pathway for electrical current',
        'A flat piece that holds electronic components',
        'Related to computers and modern devices'
      ],
      time_limit: 150,
      max_guesses: 4,
      base_score: 300
    }
  ];

  for (const challenge of promptleChallenges) {
    await pool.query(
      `INSERT INTO promptle_challenges 
       (title, description, difficulty, category, image_url, keywords, aliases, hints, time_limit, max_guesses, base_score) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        challenge.title,
        challenge.description,
        challenge.difficulty,
        challenge.category,
        challenge.image_url,
        JSON.stringify(challenge.keywords),
        JSON.stringify(challenge.aliases),
        JSON.stringify(challenge.hints),
        challenge.time_limit,
        challenge.max_guesses,
        challenge.base_score
      ]
    );
  }

  console.log('✅ Promptle challenges seeded (5 challenges)');

  // Seed Survival scenarios
  const survivalScenarios = [
    {
      title: 'Zombie Campus Outbreak',
      description: 'Survive a zombie outbreak at your college campus',
      difficulty: 'medium',
      category: 'horror',
      initial_situation: 'You are in the college library when suddenly you hear screams and commotion outside. Through the window, you see students running and what appear to be zombies chasing them. The library is on the second floor, and you can hear growling sounds coming from the stairwell. You need to survive and find a way to safety.',
      objectives: [
        'Find a safe place to hide temporarily',
        'Locate other survivors',
        'Find weapons or tools for protection',
        'Discover an escape route off campus',
        'Survive for 2 hours until military rescue arrives'
      ],
      initial_inventory: [
        'Backpack',
        'Laptop computer',
        'Water bottle (half full)',
        'Energy bar',
        'Phone (20% battery)',
        'Student ID card',
        'Textbook'
      ],
      max_turns: 15,
      time_per_turn: 120,
      base_score: 200
    },
    {
      title: 'Space Station Emergency',
      description: 'Critical system failure on an orbital space station',
      difficulty: 'hard',
      category: 'sci-fi',
      initial_situation: 'You are aboard the International Space Station when a critical system failure occurs. The main oxygen generator has shut down, communications with Earth are intermittent, and a solar panel array has been damaged by debris. You have approximately 4 hours of oxygen remaining in the emergency reserves.',
      objectives: [
        'Restore primary oxygen generation system',
        'Re-establish stable communication with Earth',
        'Repair the damaged solar panel array',
        'Conserve remaining oxygen supplies',
        'Survive until the emergency rescue mission arrives'
      ],
      initial_inventory: [
        'Emergency toolkit',
        'Portable oxygen tank (2 hours)',
        'Communication device (damaged)',
        'Emergency rations',
        'First aid kit',
        'Repair manual',
        'Flashlight'
      ],
      max_turns: 12,
      time_per_turn: 180,
      base_score: 300
    },
    {
      title: 'Desert Island Survival',
      description: 'Stranded on a tropical island after a plane crash',
      difficulty: 'medium',
      category: 'survival',
      initial_situation: 'Your small aircraft has crash-landed on an uninhabited tropical island. The pilot was injured in the crash, and the radio is damaged. You need to survive until search and rescue teams can locate you, which could take several days.',
      objectives: [
        'Find or create fresh water source',
        'Build shelter from the elements',
        'Signal for rescue',
        'Find food sources',
        'Treat the pilot\'s injuries',
        'Survive for 5 days minimum'
      ],
      initial_inventory: [
        'Damaged radio',
        'First aid kit',
        'Flashlight',
        'Pocket knife',
        'Water bottle (empty)',
        'Lighter',
        'Piece of metal from plane'
      ],
      max_turns: 20,
      time_per_turn: 150,
      base_score: 250
    },
    {
      title: 'Underground Bunker Escape',
      description: 'Trapped in an abandoned military bunker',
      difficulty: 'hard',
      category: 'thriller',
      initial_situation: 'You wake up in an abandoned underground military bunker with no memory of how you got there. The entrance you came through has been sealed, and the emergency lighting is flickering. You hear strange mechanical sounds echoing through the corridors.',
      objectives: [
        'Explore the bunker safely',
        'Find an alternative exit',
        'Restore power to critical systems',
        'Avoid or neutralize security systems',
        'Escape the bunker before air supply runs out'
      ],
      initial_inventory: [
        'Keycard (unknown access level)',
        'Small flashlight',
        'Notebook with cryptic notes',
        'Pen',
        'Energy bar',
        'Watch'
      ],
      max_turns: 18,
      time_per_turn: 180,
      base_score: 350
    },
    {
      title: 'Mountain Hiking Emergency',
      description: 'Lost during a solo hiking trip in dangerous weather',
      difficulty: 'easy',
      category: 'outdoor',
      initial_situation: 'You\'ve been hiking alone in the mountains when a sudden snowstorm hits. You\'ve lost the trail, your GPS battery is dead, and visibility is near zero. You need to find shelter and survive until the storm passes and rescue teams can find you.',
      objectives: [
        'Find or build emergency shelter',
        'Start a fire for warmth',
        'Signal your location to rescuers',
        'Find safe drinking water',
        'Stay warm and survive the night'
      ],
      initial_inventory: [
        'Backpack',
        'Sleeping bag',
        'Matches (waterproof)',
        'Compass',
        'Trail mix',
        'Water bottle (full)',
        'Whistle',
        'Map (partially readable)'
      ],
      max_turns: 12,
      time_per_turn: 120,
      base_score: 150
    }
  ];

  for (const scenario of survivalScenarios) {
    await pool.query(
      `INSERT INTO survival_scenarios 
       (title, description, difficulty, category, initial_situation, objectives, initial_inventory, max_turns, time_per_turn, base_score) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        scenario.title,
        scenario.description,
        scenario.difficulty,
        scenario.category,
        scenario.initial_situation,
        JSON.stringify(scenario.objectives),
        JSON.stringify(scenario.initial_inventory),
        scenario.max_turns,
        scenario.time_per_turn,
        scenario.base_score
      ]
    );
  }

  console.log('✅ Survival scenarios seeded (5 scenarios)');

  console.log('');
  console.log('🎉 Supabase database seeded successfully!');
  console.log('');
  console.log('📋 Test accounts created:');
  console.log('   👑 Admin: admin@promptx.com / admin123');
  console.log('   🎮 Player: player@example.com / participant123');
  console.log('   🎮 Additional test players: player1@test.com to player10@test.com / participant123');
  console.log('');
  console.log('🎮 Game content available:');
  console.log('   🖼️  Promptle challenges: 5 (Easy to Expert difficulty)');
  console.log('   ⚔️  Survival scenarios: 5 (Easy to Hard difficulty)');
  console.log('');
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase().catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
}

export default seedDatabase;