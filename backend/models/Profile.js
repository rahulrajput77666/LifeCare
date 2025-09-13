const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    price: {
        type: Number,
        required: true // Discounted package price
    },
    description: {
        type: String,
        default: ''
    },
    // Array of test ObjectIds for this profile
    tests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test'
    }]
}, { timestamps: true });

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
