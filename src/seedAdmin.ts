import mongoose from 'mongoose';
import User from './models/user.model';
import config from './config/config';

/**
 * Script to create an admin user for testing
 * Run with: npm run seed:admin or ts-node src/seedAdmin.ts
 */

const adminData = {
  name: 'Admin User',
  email: 'admin@busticket.com',
  password: 'Admin@123456',
  role: 'admin',
  isEmailVerified: true,
  phone: '+84123456789',
  status: 'active' as const,
};

async function seedAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists with email:', adminData.email);
      console.log('   User ID:', existingAdmin._id);
      console.log('   Role:', existingAdmin.role);
      console.log('\n   To login, use:');
      console.log('   Email:', adminData.email);
      console.log('   Password: <your existing password>');

      // Update role to admin if needed
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('✅ Updated user role to admin');
      }
    } else {
      // Create new admin user
      const admin = await User.create(adminData);
      console.log('✅ Admin user created successfully!');
      console.log('\n📋 Admin Login Credentials:');
      console.log('   Email:', adminData.email);
      console.log('   Password:', adminData.password);
      console.log('   User ID:', admin._id);
      console.log('\n🔐 Login URL: http://localhost:3000/login');
      console.log('   (Use these credentials to test admin features)');
    }

    // Show admin permissions
    console.log('\n✨ Admin Permissions:');
    console.log('   - Manage Users');
    console.log('   - Manage Buses');
    console.log('   - Manage Routes');
    console.log('   - Manage Trips');
    console.log('   - Manage Bookings');
    console.log('   - Manage Operators');
    console.log('   - View Analytics');
    console.log('   - Manage Reviews');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    process.exit(1);
  }
}

// Run the seed function
seedAdmin();
