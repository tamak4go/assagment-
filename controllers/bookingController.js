const Booking = require('../models/bookingModel');
const Car = require('../models/carModel');

const MINUTES_PER_DAY = 60 * 24;
const MS_PER_MINUTE = 1000 * 60;
const MS_PER_DAY = MS_PER_MINUTE * MINUTES_PER_DAY;

// Calculate number of rental days
const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

// Check for booking date overlap
const checkDateOverlap = async (carNumber, startDate, endDate, excludeBookingId = null) => {
    const query = {
        carNumber,
        status: { $ne: 'cancelled' },
        $or: [
            {
                startDate: { $lte: new Date(endDate) },
                endDate: { $gte: new Date(startDate) }
            }
        ]
    };

    if (excludeBookingId) {
        query._id = { $ne: excludeBookingId };
    }

    const overlappingBooking = await Booking.findOne(query);
    return overlappingBooking;
};

// GET /bookings - Get all bookings
const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find();
        res.render('bookings/index', { bookings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /bookings API - Get all bookings as JSON
const getAllBookingsAPI = async (req, res) => {
    try {
        const bookings = await Booking.find();
        res.status(200).json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /bookings/:bookingId - Get single booking
const getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        res.status(200).json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /bookings - Create a new booking
const createBooking = async (req, res) => {
    try {
        const { customerName, carNumber, startDate, endDate } = req.body;

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }

        // Check if car exists
        const car = await Car.findOne({ carNumber });
        if (!car) {
            return res.status(404).json({ message: 'Car not found' });
        }

        // Check if car is available
        if (car.status === 'maintenance') {
            return res.status(400).json({ message: 'Car is under maintenance' });
        }

        // Check for date overlap with existing bookings
        const overlappingBooking = await checkDateOverlap(carNumber, startDate, endDate);
        if (overlappingBooking) {
            return res.status(400).json({ 
                message: 'Booking dates overlap with an existing booking',
                conflictingBooking: overlappingBooking
            });
        }

        // Calculate total amount
        const numberOfDays = calculateDays(startDate, endDate);
        const totalAmount = numberOfDays * car.pricePerDay;

        // Create booking
        const booking = new Booking({
            customerName,
            carNumber,
            startDate: start,
            endDate: end,
            totalAmount
        });

        const savedBooking = await booking.save();

        res.status(201).json(savedBooking);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// PUT /bookings/:bookingId - Update a booking
const updateBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { customerName, carNumber, startDate, endDate, lateDays } = req.body;

        // Find existing booking
        const existingBooking = await Booking.findById(bookingId);
        if (!existingBooking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // If dates or car are being updated, validate them
        const finalCarNumber = carNumber || existingBooking.carNumber;
        const finalStartDate = startDate || existingBooking.startDate;
        const finalEndDate = endDate || existingBooking.endDate;

        if (startDate || endDate || carNumber) {
            const start = new Date(finalStartDate);
            const end = new Date(finalEndDate);

            if (end <= start) {
                return res.status(400).json({ message: 'End date must be after start date' });
            }

            // Check for date overlap (excluding current booking)
            const overlappingBooking = await checkDateOverlap(finalCarNumber, finalStartDate, finalEndDate, bookingId);
            if (overlappingBooking) {
                return res.status(400).json({ 
                    message: 'Booking dates overlap with an existing booking',
                    conflictingBooking: overlappingBooking
                });
            }
        }

        // Recalculate total amount if dates or car changed
        let totalAmount = existingBooking.totalAmount;

        if (startDate || endDate || carNumber) {
            const car = await Car.findOne({ carNumber: finalCarNumber });
            if (!car) {
                return res.status(404).json({ message: 'Car not found' });
            }
            const numberOfDays = calculateDays(finalStartDate, finalEndDate);
            totalAmount = numberOfDays * car.pricePerDay;
        }

        // Optional: override overdue days when booking completed
        // - Recompute lateMinutes, penaltyAmount, totalAmount
        // - Only allowed when booking is completed (has dropOffAt)
        let nextLateDays = existingBooking.lateDays || 0;
        let nextLateMinutes = existingBooking.lateMinutes || 0;
        let nextPenaltyAmount = existingBooking.penaltyAmount || 0;
        let nextTotalAmount = totalAmount;

        if (lateDays !== undefined) {
            if (existingBooking.status !== 'completed' || !existingBooking.dropOffAt) {
                return res.status(400).json({
                    message: 'Chỉ được chỉnh sửa overdue days khi booking đã completed'
                });
            }

            const parsedLateDays = Number(lateDays);
            if (!Number.isFinite(parsedLateDays) || parsedLateDays < 0 || !Number.isInteger(parsedLateDays)) {
                return res.status(400).json({
                    message: 'Overdue days (lateDays) phải là số nguyên >= 0'
                });
            }

            nextLateDays = parsedLateDays;
            nextLateMinutes = nextLateDays * MINUTES_PER_DAY;
            nextPenaltyAmount = nextLateMinutes * 50;
            nextTotalAmount = totalAmount + nextPenaltyAmount;
        }

        // Update booking
        const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId,
            {
                customerName: customerName || existingBooking.customerName,
                carNumber: finalCarNumber,
                startDate: finalStartDate,
                endDate: finalEndDate,
                lateDays: nextLateDays,
                lateMinutes: nextLateMinutes,
                penaltyAmount: nextPenaltyAmount,
                totalAmount: nextTotalAmount
            },
            { new: true, runValidators: true }
        );

        res.status(200).json(updatedBooking);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// DELETE /bookings/:bookingId - Delete a booking
const deleteBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findByIdAndDelete(bookingId);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.status === 'picked_up') {
            // Revert car status back to available if the active booking is deleted
            await Car.findOneAndUpdate({ carNumber: booking.carNumber }, { status: 'available' });
        }

        res.status(200).json({ message: 'Booking deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /bookings/:bookingId/receive - Receive car (check-in)
const receiveCar = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const now = new Date();

        // Ngày nhận xe phải >= startDate
        if (now < booking.startDate) {
            return res.status(400).json({
                message: 'Ngày nhận xe phải lớn hơn hoặc bằng ngày bắt đầu (startDate)'
            });
        }

        // Nếu đã nhận rồi thì không nhận lại
        if (booking.status === 'picked_up') {
            return res.status(400).json({
                message: 'Booking đã được nhận xe trước đó'
            });
        }

        booking.status = 'picked_up';
        booking.pickUpAt = now;
        await booking.save();

        // Update car status to rented
        await Car.findOneAndUpdate({ carNumber: booking.carNumber }, { status: 'rented' });

        return res.status(200).json({
            message: 'Nhận xe thành công',
            booking
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// POST /bookings/:bookingId/complete - Drop off car (check-out)
const completeBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const now = new Date();

        if (!booking.pickUpAt) {
            return res.status(400).json({
                message: 'Chưa nhận xe (pickUpAt chưa có), không thể hoàn tất booking'
            });
        }

        // Ngày trả xe phải >= ngày nhận xe
        if (now < booking.pickUpAt) {
            return res.status(400).json({
                message: 'Ngày trả xe phải lớn hơn hoặc bằng ngày nhận xe (pickUpAt)'
            });
        }

        booking.status = 'completed';
        booking.dropOffAt = now;

        // Tính tiền phạt nếu trả quá hạn: số phút * 50
        const endAt = new Date(booking.endDate);
        const lateMs = now - endAt;
        const lateMinutes = lateMs > 0 ? Math.ceil(lateMs / MS_PER_MINUTE) : 0;
        const lateDays = lateMs > 0 ? Math.ceil(lateMs / MS_PER_DAY) : 0;
        const penaltyAmount = lateMinutes * 50;

        // Tính lại tiền thuê cơ bản + cộng phạt
        const car = await Car.findOne({ carNumber: booking.carNumber });
        if (!car) {
            return res.status(404).json({ message: 'Car not found' });
        }

        const numberOfDays = calculateDays(booking.startDate, booking.endDate);
        const baseAmount = numberOfDays * car.pricePerDay;

        booking.lateMinutes = lateMinutes;
        booking.lateDays = lateDays;
        booking.penaltyAmount = penaltyAmount;
        booking.totalAmount = baseAmount + penaltyAmount;
        await booking.save();

        // Cập nhật trạng thái xe về available
        await Car.findOneAndUpdate(
            { carNumber: booking.carNumber },
            { status: 'available' }
        );

        return res.status(200).json({
            message: 'Hoàn tất chuyến thuê xe thành công',
            booking,
            lateMinutes,
            lateDays,
            penaltyAmount,
            totalAmount: booking.totalAmount
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Render create booking form
const renderCreateForm = async (req, res) => {
    try {
        const cars = await Car.find({ status: { $ne: 'maintenance' } });
        res.render('bookings/create', { cars });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

// Render edit booking form
const renderEditForm = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId);
        const cars = await Car.find({ status: { $ne: 'maintenance' } });
        if (!booking) {
            return res.status(404).send('Booking not found');
        }
        res.render('bookings/edit', { booking, cars });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

module.exports = {
    getAllBookings,
    getAllBookingsAPI,
    getBookingById,
    createBooking,
    updateBooking,
    deleteBooking,
    renderCreateForm,
    renderEditForm,
    receiveCar,
    completeBooking
};
