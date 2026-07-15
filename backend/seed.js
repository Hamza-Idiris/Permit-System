const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/permit-system');
    console.log('MongoDB Connected for seeding...');

    const email = 'admin@mogadishu.so';
    const existing = await User.findOne({ email });

    if (existing) {
      console.log('Super Admin already exists. Updating role to superadmin...');
      existing.role = 'superadmin';
      await existing.save();
    } else {
      console.log('Creating new Super Admin...');
      await User.create({
        fullName: 'Super Admin',
        email: email,
        password: 'AdminPassword123!', // Ensure this meets validation requirements
        role: 'superadmin',
        district: 'Hamar Jajab'
      });
      console.log('Super Admin created successfully!');
    }

    process.exit(0);
  } catch (err) {
    console.error('Seeding Error:', err.message);
    process.exit(1);
  }
};

seedSuperAdmin();
