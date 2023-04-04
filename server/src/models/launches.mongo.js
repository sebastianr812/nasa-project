const mongoose = require('mongoose');

const launchesSchema = new mongoose.Schema({
    flightNumber: {
        type: Number,
        required: true,
    },
    mission: {
        type: String,
        required: true
    },
    rocket: {
        type: String,
        required: true
    },
    launchDate: {
        type: Date,
        required: true
    },
    target: {
        type: String,
    },
    upcoming: {
        type: Boolean,
        required: true
    },
    success: {
        type: Boolean,
        requried: true,
        default: true
    },
    customers: [String],

});

// Connects launchesSchema with the "launches" collection
module.exports = mongoose.model('Launch', launchesSchema);
