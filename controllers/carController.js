const Car = require('../models/carModel');

// Get all cars
const getAllCars = async (req, res) => {
    try {
        const cars = await Car.find();
        res.render('cars/index', { cars });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all cars as JSON (API)
const getAllCarsAPI = async (req, res) => {
    try {
        const cars = await Car.find();
        res.status(200).json(cars);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single car by carNumber
const getCarByNumber = async (req, res) => {
    try {
        const car = await Car.findOne({ carNumber: req.params.carNumber });
        if (!car) {
            return res.status(404).json({ message: 'Car not found' });
        }
        res.status(200).json(car);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a new car
const createCar = async (req, res) => {
    try {
        const { carNumber, capacity, status, pricePerDay, features } = req.body;
        
        // Check if car already exists
        const existingCar = await Car.findOne({ carNumber });
        if (existingCar) {
            return res.status(400).json({ message: 'Car with this number already exists' });
        }

        const car = new Car({
            carNumber,
            capacity,
            status: status || 'available',
            pricePerDay,
            features: features || []
        });

        const savedCar = await car.save();
        res.status(201).json(savedCar);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update a car
const updateCar = async (req, res) => {
    try {
        const { carNumber } = req.params;
        const updateData = req.body;

        const car = await Car.findOneAndUpdate(
            { carNumber },
            updateData,
            { new: true, runValidators: true }
        );

        if (!car) {
            return res.status(404).json({ message: 'Car not found' });
        }

        res.status(200).json(car);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a car
const deleteCar = async (req, res) => {
    try {
        const { carNumber } = req.params;
        const car = await Car.findOneAndDelete({ carNumber });

        if (!car) {
            return res.status(404).json({ message: 'Car not found' });
        }

        res.status(200).json({ message: 'Car deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Render create car form
const renderCreateForm = (req, res) => {
    res.render('cars/create');
};

// Render edit car form
const renderEditForm = async (req, res) => {
    try {
        const car = await Car.findOne({ carNumber: req.params.carNumber });
        if (!car) {
            return res.status(404).send('Car not found');
        }
        res.render('cars/edit', { car });
    } catch (error) {
        res.status(500).send(error.message);
    }
};

module.exports = {
    getAllCars,
    getAllCarsAPI,
    getCarByNumber,
    createCar,
    updateCar,
    deleteCar,
    renderCreateForm,
    renderEditForm
};
