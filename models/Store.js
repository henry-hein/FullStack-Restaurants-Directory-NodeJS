const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs'); //For creating user readable url paths

const storeSchema = new mongoose.Schema({
  name : {
    type: String,
    trim: true,
    required: 'Please enter a store name',
  },
  slug: String,
  description: {
    type: String,
    trim: true,
  },
  tags: [String]
});

storeSchema.pre('save', function(next) {
  if(!this.isModified('name')) {
    next(); //skip
    return; //stop this function from running
  }
  this.slug = slug(this.name);
  next();
  //TODO: make more resilient so slugs are unique
})

module.exports = mongoose.model('Store', storeSchema);



