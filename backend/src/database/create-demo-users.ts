import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

export const createDemoUsers = async () => {
  console.log('🌱 Creating demo users in Supabase...');
  
  try {
    // Hash passwords
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    const participantPasswordHash = await bcrypt.hash('participant123', 12);
    
    // Demo users to create
    const demoUsers = [
      {
        email: 'admin@promptx.com',
        username: 'admin',
        password_hash: adminPasswordHash,
        role: 'admin'
      },
      {
        email: 'player@example.com', 
        username: 'player',
        password_hash: participantPasswordHash,
        role: 'participant'
      },
      {
        email: 'demo@test.com',
        username: 'demo',
        password_hash: participantPasswordHash,
        role: 'participant'
      }
    ];
    
    for (const user of demoUsers) {
      console.log(`Creating user: ${user.email}`);
      
      // Check if user already exists
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .execute();
      
      if (existingUsers && existingUsers.length > 0) {
        console.log(`  ⚠️  User ${user.email} already exists, skipping...`);
        continue;
      }
      
      // Create user
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([user])
        .select('id, email, username, role')
        .single();
      
      if (error) {
        console.error(`  ❌ Error creating user ${user.email}:`, error.message);
      } else {
        console.log(`  ✅ Created user: ${user.email}`);
      }
    }
    
    console.log('');
    console.log('🎉 Demo users creation completed!');
    console.log('');
    console.log('📋 Available test accounts:');
    console.log('   👑 Admin: admin@promptx.com / admin123');
    console.log('   🎮 Player: player@example.com / participant123');
    console.log('   🎮 Demo: demo@test.com / participant123');
    console.log('');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create demo users:', error);
    return false;
  }
};

// Run if called directly
if (require.main === module) {
  createDemoUsers().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}