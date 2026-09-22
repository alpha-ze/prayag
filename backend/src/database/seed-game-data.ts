import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey);

async function seedGameData() {
  console.log('🌱 Starting game data seed...');

  // ─── Challenges ────────────────────────────────────────────────────────────

  const challenges = [
    {
      title: 'Space Explorer',
      description: 'Guess the space-themed keywords hidden in this image. Think about the cosmos!',
      image_url: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800&h=800&fit=crop',
      generation_prompt: 'A breathtaking view of outer space with stars, galaxies, planets and a rocket ship launching',
      hint: 'Think about things you find in outer space: celestial bodies, spacecraft, and cosmic features.',
      difficulty: 'medium',
      category: 'Space',
      max_guesses: 8,
      time_limit: 300,
      scoring: {
        baseScore: 100,
        correctBonus: 100,
        completionBonus: 200,
        timeBonus: 50,
        wrongPenalty: 10,
        hintPenalty: 25,
      },
      is_active: true,
    },
    {
      title: 'Ocean Deep',
      description: 'Discover the ocean-themed keywords hidden in this underwater scene.',
      image_url: 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&h=800&fit=crop',
      generation_prompt: 'A deep ocean scene with colorful coral reefs, fish, waves, and a dolphin',
      hint: 'Think about things found in the ocean: sea life, water features, and marine environments.',
      difficulty: 'easy',
      category: 'Nature',
      max_guesses: 8,
      time_limit: 300,
      scoring: {
        baseScore: 100,
        correctBonus: 100,
        completionBonus: 200,
        timeBonus: 50,
        wrongPenalty: 10,
        hintPenalty: 25,
      },
      is_active: true,
    },
  ];

  const challengeKeywords: Record<number, Array<{ keyword: string; aliases: string[]; is_required: boolean; points: number }>> = {
    0: [
      { keyword: 'space', aliases: ['cosmos', 'outer space'], is_required: true, points: 100 },
      { keyword: 'star', aliases: ['stars', 'stellar'], is_required: true, points: 100 },
      { keyword: 'galaxy', aliases: ['galaxies', 'milky way'], is_required: true, points: 120 },
      { keyword: 'planet', aliases: ['planets', 'planetary'], is_required: true, points: 100 },
      { keyword: 'rocket', aliases: ['spacecraft', 'spaceship', 'rocket ship'], is_required: true, points: 150 },
    ],
    1: [
      { keyword: 'ocean', aliases: ['sea', 'marine', 'water'], is_required: true, points: 100 },
      { keyword: 'coral', aliases: ['coral reef', 'reef'], is_required: true, points: 120 },
      { keyword: 'fish', aliases: ['fishes', 'marine life'], is_required: true, points: 100 },
      { keyword: 'dolphin', aliases: ['dolphins', 'porpoise'], is_required: true, points: 150 },
      { keyword: 'wave', aliases: ['waves', 'tidal wave', 'surf'], is_required: true, points: 100 },
    ],
  };

  for (let i = 0; i < challenges.length; i++) {
    const challenge = challenges[i];
    console.log(`\n📋 Inserting challenge: "${challenge.title}"`);

    // Check if already exists
    const { data: existing } = await db
      .from('challenges')
      .select('id')
      .eq('title', challenge.title)
      .maybeSingle();

    let challengeId: string;

    if (existing) {
      challengeId = existing.id;
      console.log(`   ⏭️  Already exists with id: ${challengeId}`);
    } else {
      const { data, error } = await db
        .from('challenges')
        .insert(challenge)
        .select()
        .single();

      if (error || !data) {
        console.error(`   ❌ Failed to insert challenge:`, error);
        continue;
      }

      challengeId = data.id;
      console.log(`   ✅ Inserted with id: ${challengeId}`);
    }

    // Insert keywords
    const keywords = challengeKeywords[i];
    for (const kw of keywords) {
      const { data: existingKw } = await db
        .from('challenge_keywords')
        .select('id')
        .eq('challenge_id', challengeId)
        .eq('keyword', kw.keyword)
        .maybeSingle();

      if (existingKw) {
        console.log(`   ⏭️  Keyword "${kw.keyword}" already exists`);
        continue;
      }

      const { error: kwError } = await db
        .from('challenge_keywords')
        .insert({ ...kw, challenge_id: challengeId });

      if (kwError) {
        console.error(`   ❌ Failed to insert keyword "${kw.keyword}":`, kwError);
      } else {
        console.log(`   ✅ Keyword: ${kw.keyword}`);
      }
    }
  }

  // ─── Scenarios ─────────────────────────────────────────────────────────────

  const scenarios = [
    {
      title: 'Desert Survival',
      description: 'You are stranded in a vast, scorching desert after your vehicle broke down. The sun is relentless, your water supply is nearly depleted, and civilization seems far away. Use your wits and available resources to survive and find your way back to safety.',
      environment: 'Harsh desert — extreme heat, sand dunes, sparse vegetation, limited water sources',
      difficulty: 'medium',
      category: 'Survival',
      starting_location: 'Broken-down vehicle on desert road',
      starting_health: 5,
      max_health: 5,
      starting_inventory: [
        { name: 'Water Bottle', quantity: 1, condition: 100 },
        { name: 'Compass', quantity: 1, condition: 100 },
        { name: 'Knife', quantity: 1, condition: 100 },
        { name: 'Emergency Flare', quantity: 2, condition: 100 },
      ],
      objectives: [
        { id: 'find_water', title: 'Find Water', description: 'Find a reliable water source to survive the heat', isRequired: true, points: 200 },
        { id: 'reach_safety', title: 'Reach Safety', description: 'Navigate to the nearest town or road with traffic', isRequired: true, points: 300 },
        { id: 'survive_5_turns', title: 'Survive 5 Turns', description: 'Survive for at least 5 turns without dying', isRequired: false, points: 100 },
      ],
      max_turns: 15,
      time_limit: 1800,
      scoring: {
        baseScore: 100,
        successBonus: 50,
        partialSuccessBonus: 25,
        failurePenalty: 20,
        objectiveBonus: 200,
        survivalBonus: 300,
        timeBonus: 50,
      },
      rules: [
        { id: 'rule_1', type: 'health', description: 'Taking no action loses 1 health per turn due to dehydration', parameters: {} },
        { id: 'rule_2', type: 'resource', description: 'Water sources can be found by exploring carefully', parameters: {} },
        { id: 'rule_3', type: 'objective', description: 'Completing required objectives is needed to truly survive', parameters: {} },
      ],
      is_active: true,
    },
    {
      title: 'Jungle Escape',
      description: 'You are lost deep in a dense jungle after a hiking expedition went wrong. Your group got separated, your phone has no signal, and night is approaching fast. Dangerous wildlife lurks, the terrain is treacherous, and you need to navigate your way to the extraction point before it is too late.',
      environment: 'Dense tropical jungle — high humidity, thick canopy, rivers, dangerous wildlife, limited visibility',
      difficulty: 'hard',
      category: 'Survival',
      starting_location: 'Deep jungle clearing, 5km from last known path',
      starting_health: 5,
      max_health: 5,
      starting_inventory: [
        { name: 'Backpack', quantity: 1, condition: 100 },
        { name: 'Lighter', quantity: 1, condition: 100 },
        { name: 'First Aid Kit', quantity: 1, condition: 100 },
        { name: 'Rope', quantity: 1, condition: 100 },
      ],
      objectives: [
        { id: 'build_shelter', title: 'Build Shelter', description: 'Construct or find shelter before nightfall to avoid dangerous nocturnal predators', isRequired: true, points: 150 },
        { id: 'find_food', title: 'Find Food', description: 'Find safe food sources to maintain energy', isRequired: false, points: 100 },
        { id: 'reach_extraction', title: 'Reach Extraction Point', description: 'Navigate through the jungle to the helicopter extraction point', isRequired: true, points: 400 },
      ],
      max_turns: 20,
      time_limit: 2400,
      scoring: {
        baseScore: 100,
        successBonus: 75,
        partialSuccessBonus: 30,
        failurePenalty: 25,
        objectiveBonus: 250,
        survivalBonus: 400,
        timeBonus: 60,
      },
      rules: [
        { id: 'rule_1', type: 'environment', description: 'Night falls every 5 turns and increases danger significantly', parameters: {} },
        { id: 'rule_2', type: 'wildlife', description: 'Sudden loud noises may attract dangerous predators', parameters: {} },
        { id: 'rule_3', type: 'navigation', description: 'Following rivers or high ground generally leads toward civilization', parameters: {} },
      ],
      is_active: true,
    },
  ];

  for (const scenario of scenarios) {
    console.log(`\n🏜️  Inserting scenario: "${scenario.title}"`);

    const { data: existing } = await db
      .from('scenarios')
      .select('id')
      .eq('title', scenario.title)
      .maybeSingle();

    if (existing) {
      console.log(`   ⏭️  Already exists with id: ${existing.id}`);
      continue;
    }

    const { data, error } = await db
      .from('scenarios')
      .insert(scenario)
      .select()
      .single();

    if (error || !data) {
      console.error(`   ❌ Failed to insert scenario:`, error);
    } else {
      console.log(`   ✅ Inserted with id: ${data.id}`);
    }
  }

  console.log('\n✅ Game data seed complete!');
}

seedGameData().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
