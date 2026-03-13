const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: true
    },
    carNumber: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    penaltyAmount: {
        type: Number,
        default: 0
    },
    lateMinutes: {
        type: Number,
        default: 0
    },
    lateDays: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'picked_up', 'completed', 'cancelled'],
        default: 'pending'
    },
    pickUpAt: {
        type: Date
    },
    dropOffAt: {
        type: Date
    }
}, {
    timestamps: true
});

const Booking = mongoose.model('Booking', BookingSchema);

module.exports = Booking;
