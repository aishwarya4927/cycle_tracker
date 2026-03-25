const express = require('express');
const router = express.Router();
const Cycle = require('../models/Cycle');
const { protect } = require('../middleware/auth');

// @route   GET /api/cycles
router.get('/', protect, async (req, res) => {
  try {
    const cycles = await Cycle.find({ user: req.user._id }).sort({ startDate: -1 });
    res.json({ success: true, count: cycles.length, cycles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/cycles
router.post('/', protect, async (req, res) => {
  try {
    const { startDate, endDate, flow, symptoms, notes } = req.body;
    let periodLength = null;
    if (endDate) {
      periodLength = Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    }

    // Find previous cycle to calculate cycle length
    const prevCycle = await Cycle.findOne({ user: req.user._id }).sort({ startDate: -1 });
    let cycleLength = null;
    if (prevCycle) {
      cycleLength = Math.round((new Date(startDate) - new Date(prevCycle.startDate)) / (1000 * 60 * 60 * 24));
      // Mark previous cycle as irregular if outside 21-35 days
      if (cycleLength < 21 || cycleLength > 35) {
        await Cycle.findByIdAndUpdate(prevCycle._id, { isIrregular: true });
      }
    }

    const cycle = await Cycle.create({
      user: req.user._id,
      startDate,
      endDate: endDate || null,
      periodLength,
      cycleLength,
      flow,
      symptoms,
      notes
    });

    res.status(201).json({ success: true, cycle });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/cycles/:id
router.put('/:id', protect, async (req, res) => {
  try {
    let cycle = await Cycle.findOne({ _id: req.params.id, user: req.user._id });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });
    cycle = await Cycle.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, cycle });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/cycles/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const cycle = await Cycle.findOne({ _id: req.params.id, user: req.user._id });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });
    await cycle.deleteOne();
    res.json({ success: true, message: 'Cycle deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;