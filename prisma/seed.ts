/**
 * Seed script to populate database with test data
 * Run: npm run seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clear existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.reviewHistory.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.accessLog.deleteMany({});
  console.log('✅ Existing data cleared\n');

  // Create categories
  console.log('📂 Creating categories...');
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Electronics',
        description: 'Electronic devices and gadgets',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Books',
        description: 'Books and literature',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Clothing',
        description: 'Fashion and apparel',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Home & Kitchen',
        description: 'Home essentials and kitchenware',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Sports',
        description: 'Sports equipment and gear',
      },
    }),
  ]);
  console.log(`✅ Created ${categories.length} categories\n`);

  // Create review histories
  console.log('📝 Creating review histories...');

  const reviewData = [
    // Electronics - High ratings
    {
      review_id: 'REV001',
      text: 'Amazing phone! Great camera and battery life.',
      stars: 9,
      category_id: categories[0].id,
      tone: 'Positive',
      sentiment: 'Happy',
    },
    {
      review_id: 'REV001',
      text: 'Amazing phone! Great camera and battery life. Updated after 1 month.',
      stars: 10,
      category_id: categories[0].id,
      tone: 'Very Positive',
      sentiment: 'Excited',
    },
    {
      review_id: 'REV002',
      text: 'Excellent laptop for productivity.',
      stars: 8,
      category_id: categories[0].id,
      tone: null,
      sentiment: null,
    },
    {
      review_id: 'REV003',
      text: 'Good headphones but a bit pricey.',
      stars: 7,
      category_id: categories[0].id,
      tone: null,
      sentiment: null,
    },

    // Books - High ratings
    {
      review_id: 'REV004',
      text: 'Incredible story! Could not put it down.',
      stars: 10,
      category_id: categories[1].id,
      tone: 'Enthusiastic',
      sentiment: 'Delighted',
    },
    {
      review_id: 'REV005',
      text: 'Very informative and well-written.',
      stars: 9,
      category_id: categories[1].id,
      tone: null,
      sentiment: null,
    },
    {
      review_id: 'REV006',
      text: 'Good book but slow pacing.',
      stars: 7,
      category_id: categories[1].id,
      tone: null,
      sentiment: null,
    },

    // Clothing - Medium ratings
    {
      review_id: 'REV007',
      text: 'Nice shirt but shrunk after wash.',
      stars: 6,
      category_id: categories[2].id,
      tone: 'Mixed',
      sentiment: 'Disappointed',
    },
    {
      review_id: 'REV008',
      text: 'Decent quality for the price.',
      stars: 7,
      category_id: categories[2].id,
      tone: null,
      sentiment: null,
    },
    {
      review_id: 'REV009',
      text: 'Comfortable jeans, good fit.',
      stars: 8,
      category_id: categories[2].id,
      tone: null,
      sentiment: null,
    },

    // Home & Kitchen - High ratings
    {
      review_id: 'REV010',
      text: 'Best blender I have ever owned!',
      stars: 10,
      category_id: categories[3].id,
      tone: 'Excited',
      sentiment: 'Very Satisfied',
    },
    {
      review_id: 'REV011',
      text: 'Great knife set, very sharp.',
      stars: 9,
      category_id: categories[3].id,
      tone: null,
      sentiment: null,
    },
    {
      review_id: 'REV012',
      text: 'Good pans but not non-stick.',
      stars: 7,
      category_id: categories[3].id,
      tone: null,
      sentiment: null,
    },

    // Sports - Low ratings
    {
      review_id: 'REV013',
      text: 'Poor quality, broke after one use.',
      stars: 2,
      category_id: categories[4].id,
      tone: 'Negative',
      sentiment: 'Angry',
    },
    {
      review_id: 'REV014',
      text: 'Not worth the money.',
      stars: 3,
      category_id: categories[4].id,
      tone: null,
      sentiment: null,
    },
    {
      review_id: 'REV015',
      text: 'Average dumbbells, nothing special.',
      stars: 5,
      category_id: categories[4].id,
      tone: null,
      sentiment: null,
    },

    // Additional reviews for pagination testing
    ...Array.from({ length: 20 }, (_, i) => ({
      review_id: `REV_ELEC_${i + 100}`,
      text: `Electronics review ${i + 1} - Testing pagination.`,
      stars: Math.floor(Math.random() * 5) + 6, // 6-10 stars
      category_id: categories[0].id,
      tone: null,
      sentiment: null,
    })),

    ...Array.from({ length: 15 }, (_, i) => ({
      review_id: `REV_BOOK_${i + 100}`,
      text: `Book review ${i + 1} - Great read!`,
      stars: Math.floor(Math.random() * 3) + 8, // 8-10 stars
      category_id: categories[1].id,
      tone: null,
      sentiment: null,
    })),
  ];

  // Insert reviews with slight delays to ensure different created_at timestamps
  for (const review of reviewData) {
    await prisma.reviewHistory.create({
      data: review as any,
    });
    // Small delay to ensure timestamp differences
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  console.log(`✅ Created ${reviewData.length} review histories\n`);

  // Summary
  console.log('📊 Database seeding complete!\n');
  console.log('Summary:');
  console.log(`  - Categories: ${categories.length}`);
  console.log(`  - Review histories: ${reviewData.length}`);
  console.log('\n✨ You can now test the APIs:\n');
  console.log('  GET /reviews/trends');
  console.log('  GET /reviews?category_id=1&page=1&limit=10');
  console.log('  GET /reviews/pending-llm\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
