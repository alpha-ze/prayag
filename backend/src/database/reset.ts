import { query, closePool } from './connection';

async function reset() {
  try {
    console.log('Resetting database...');
    
    // Drop all tables in reverse dependency order
    const dropQueries = [
      'DROP TABLE IF EXISTS admin_actions CASCADE',
      'DROP TABLE IF EXISTS leaderboard_entries CASCADE',
      'DROP TABLE IF EXISTS survival_events CASCADE',
      'DROP TABLE IF EXISTS survival_sessions CASCADE',
      'DROP TABLE IF EXISTS promptle_guesses CASCADE',
      'DROP TABLE IF EXISTS promptle_sessions CASCADE',
      'DROP TABLE IF EXISTS challenge_keywords CASCADE',
      'DROP TABLE IF EXISTS scenarios CASCADE',
      'DROP TABLE IF EXISTS challenges CASCADE',
      'DROP TABLE IF EXISTS rounds CASCADE',
      'DROP TABLE IF EXISTS users CASCADE',
    ];

    for (const dropQuery of dropQueries) {
      await query(dropQuery);
    }

    console.log('Database reset completed successfully!');
  } catch (error) {
    console.error('Reset failed:', error);
    throw error;
  } finally {
    await closePool();
  }
}

// Run reset if called directly
if (require.main === module) {
  reset().catch((error) => {
    console.error('Reset failed:', error);
    process.exit(1);
  });
}

export default reset;