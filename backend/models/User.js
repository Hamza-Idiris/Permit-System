const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    minlength: [3, 'Full name must be at least 3 characters'],
    match: [/^[a-zA-Z\s]+$/, 'Full name must contain only alphabets and spaces']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [
      /^\+252(60|61|62|63|65|66|67|68|69|70|71|77|90)\d{7}$/,
      'unexisting Number'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    validate: {
      validator: function (v) {
        // Skip strict rules ONLY if this is a temporary password set by an admin (_isTemporaryPassword is a virtual-like flag)
        if (this._isTemporaryPassword) return true;

        // Strict rules for everyone else (including superadmin themselves)
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v);
      },
      message: 'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character'
    },
    select: false // Do not return password by default
  },
  role: {
    type: String,
    enum: ['superadmin', 'staff', 'inspector', 'applicant'],
    default: 'applicant'
  },
  district: {
    type: String,
    default: '' // Hodan, Daynile, etc.
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    required: [true, 'Gender is required']
  },
  resetCode: {
    type: String,
    select: false
  },
  resetCodeExpire: {
    type: Date,
    select: false
  },
  passwordLastChanged: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
