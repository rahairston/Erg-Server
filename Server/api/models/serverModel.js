'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  password: {
    type: String, 
    required: true 
  },
  token: {
    type: String
  },
  createdDate: {
    type: Date,
    default: Date.now
  },
  isSupervisor: {
    type: Boolean,
    default: false
  },
  Users: {
    type: Array,
  },
  averageRisk: {
    type: Number,
    default: 0
  },
  name: {
    type: String,
    default: ""
  },
  age: {
    type: Number,
    default: 0
  },
  weight: {
    type: Number,
    default: 0
  },
  height: {
    type: String,
    default: 0
  }
});

//Using link below for password auth
//https://www.mongodb.com/blog/post/password-authentication-with-mongoose-part-1
UserSchema.pre('save', function(next) {
  var user = this;

  // only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) return next();

  // generate a salt
  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
    if (err) return next(err);

    // hash the password using our new salt
    bcrypt.hash(user.password, salt, function(err, hash) {
        if (err) return next(err);

        // override the cleartext password with the hashed one
        user.password = hash;
        next();
    });
  });
});

UserSchema.methods.comparePassword = function(candidatePassword) {
  var userPass = this.password;
  return new Promise(function(resolve, reject) {
    bcrypt.compare(candidatePassword, userPass, function(err, isMatch) {
        if (err || !isMatch) reject(isMatch);
        resolve();
    });
  });
};

module.exports = mongoose.model('User', UserSchema);
