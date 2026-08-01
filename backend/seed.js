const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const ADMIN = {
  fullName: 'Super Admin',
  email: 'admin@mogadishu.so',
  phone: '+252612000000',
  password: 'AdminPassword123!',
  role: 'superadmin',
  district: 'Hamar Jajab',
  gender: 'Male',
};

const seedSuperAdmin = async () => {
  try {
    const uri =
      process.env.MONGODB_URI ||
      process.env.MONGODB_URL ||
      'mongodb://localhost:27017/permit-system';
    await mongoose.connect(uri);
    console.log('MongoDB Connected for seeding...');
    console.log(`Database: ${uri.includes('mongodb+srv') ? 'MongoDB Atlas (cloud)' : 'Local MongoDB'}`);

    const existing = await User.findOne({ email: ADMIN.email }).select('+password');

    if (existing) {
      existing.fullName = ADMIN.fullName;
      existing.phone = ADMIN.phone;
      existing.password = ADMIN.password;
      existing.role = ADMIN.role;
      existing.district = ADMIN.district;
      existing.gender = ADMIN.gender;
      existing.isActive = true;
      await existing.save();
      console.log('Super Admin already existed — credentials refreshed.');
    } else {
      await User.create(ADMIN);
      console.log('Super Admin created successfully!');
    }

    console.log('');
    console.log('========================================');
    console.log('  Default Super Admin Login');
    console.log('========================================');
    console.log(`  Email:    ${ADMIN.email}`);
    console.log(`  Password: ${ADMIN.password}`);
    console.log('========================================');
    console.log('  Change this password after first login.');
    console.log('');

    process.exit(0);
  } catch (err) {
    console.error('Seeding Error:', err.message);
    process.exit(1);
  }
};

seedSuperAdmin();
