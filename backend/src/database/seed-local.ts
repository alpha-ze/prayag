import { getLocalDatabase } from './connection-local';
import bcrypt from 'bcryptjs';

const seedDatabase = async () => {
  const db = await getLocalDatabase();

  console.log('🌱 Seeding local database...');

  // Clear existing data
  await db.run('DELETE FROM game_actions');
  await db.run('DELETE FROM game_sessions');
  await db.run('DELETE FROM leaderboard_entries');
  await db.run('DELETE FROM promptle_challenges');
  await db.run('DELETE FROM survival_scenarios');
  await db.run('DELETE FROM users');

  // Seed users
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const userPasswordHash = await bcrypt.hash('participant123', 10);

  await db.run(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
    ['admin@promptx.com', adminPasswordHash, 'Admin User', 'admin']
  );

  await db.run(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
    ['player@example.com', userPasswordHash, 'Test Player', 'participant']
  );

  // Add more test users
  for (let i = 1; i <= 5; i++) {
    await db.run(
      'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [`player${i}@test.com`, userPasswordHash, `Player ${i}`, 'participant']
    );
  }

  // Seed Promptle challenges
  const promptleChallenges = [
    {
      title: 'Space Explorer',
      description: 'Identify objects and concepts related to space exploration',
      difficulty: 'easy',
      category: 'space',
      image_url: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06',
      keywords: JSON.stringify(['astronaut', 'helmet', 'space', 'suit']),
      aliases: JSON.stringify({
        'astronaut': ['spaceman', 'cosmonaut'],
        'helmet': ['headgear', 'protection'],
        'space': ['cosmos', 'universe'],
        'suit': ['spacesuit', 'gear']
      }),
      hints: JSON.stringify([
        'This person travels to space',
        'They wear protective gear',
        'They explore the cosmos'
      ])
    },
    {
      title: 'Nature\'s Beauty',
      description: 'Discover the wonders of the natural world',
      difficulty: 'medium',
      category: 'nature',
      image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
      keywords: JSON.stringify(['mountain', 'lake', 'reflection', 'forest']),
      aliases: JSON.stringify({
        'mountain': ['peak', 'summit', 'hill'],
        'lake': ['water', 'pond'],
        'reflection': ['mirror', 'image'],
        'forest': ['woods', 'trees']
      }),
      hints: JSON.stringify([
        'A large landform that rises high',
        'A body of still water',
        'What you see in still water'
      ])
    }
  ];

  for (const challenge of promptleChallenges) {
    await db.run(
      `INSERT INTO promptle_challenges 
       (title, description, difficulty, category, image_url, keywords, aliases, hints, time_limit, max_guesses, base_score) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        challenge.title,
        challenge.description,
        challenge.difficulty,
        challenge.category,
        challenge.image_url,
        challenge.keywords,
        challenge.aliases,
        challenge.hints,
        300,
        10,
        100
      ]
    );
  }

  // Seed Survival scenarios
  const survivalScenarios = [
    {
      title: 'Zombie Campus Outbreak',
      description: 'Survive a zombie outbreak at your college campus',
      difficulty: 'medium',
      category: 'horror',
      initial_situation: 'You are in the college library when suddenly you hear screams and commotion outside. Through the window, you see students running and what appear to be zombies chasing them. You need to survive and find a way to safety.',
      objectives: JSON.stringify([
        'Find a safe place to hide',
        'Locate other survivors',
        'Find an escape route off campus',
        'Survive for 2 hours until help arrives'
      ]),
      initial_inventory: JSON.stringify([
        'Backpack',
        'Laptop',
        'Water bottle',
        'Snack bar',
        'Phone (low battery)'
      ])
    },
    {
      title: 'Space Station Emergency',
      description: 'Critical system failure on an orbital space station',
      difficulty: 'hard',
      category: 'sci-fi',
      initial_situation: 'You are aboard the International Space Station when a critical system failure occurs. Oxygen levels are dropping, communications are down, and you must work with your crewmates to survive until the rescue mission arrives.',
      objectives: JSON.stringify([
        'Restore oxygen generation',
        'Re-establish communication with Earth',
        'Repair the damaged solar panels',
        'Survive until rescue arrives in 4 hours'
      ]),
      initial_inventory: JSON.stringify([
        'Emergency toolkit',
        'Portable oxygen tank',
        'Communication device (damaged)',
        'Emergency rations',
        'First aid kit'
      ])
    }
  ];

  for (const scenario of survivalScenarios) {
    await db.run(
      `INSERT INTO survival_scenarios 
       (title, description, difficulty, category, initial_situation, objectives, initial_inventory, max_turns, time_per_turn, base_score) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scenario.title,
        scenario.description,
        scenario.difficulty,
        scenario.category,
        scenario.initial_situation,
        scenario.objectives,
        scenario.initial_inventory,
        15,
        120,
        200
      ]
    );
  }

  console.log('✅ Local database seeded successfully');
  console.log('📋 Test accounts created:');
  console.log('   Admin: admin@promptx.com / admin123');
  console.log('   Player: player@example.com / participant123');
  console.log('   Additional test players: player1@test.com to player5@test.com / participant123');
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase().catch(console.error);
}

export { seedDatabase };