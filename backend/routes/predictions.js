const express = require('express');
const router = express.Router();
const Cycle = require('../models/Cycle');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/predictions
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const cycles = await Cycle.find({ user: req.user._id }).sort({ startDate: -1 }).limit(6);

    if (cycles.length === 0) {
      return res.status(400).json({ success: false, message: 'No cycle data available' });
    }

    // Calculate average cycle length from history or user's saved average
    let avgCycleLength = user.averageCycleLength || 28;
    const cycleLengths = cycles.filter(c => c.cycleLength).map(c => c.cycleLength);
    if (cycleLengths.length > 0) {
      avgCycleLength = Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length);
    }

    // Average period length
    let avgPeriodLength = user.averagePeriodLength || 5;
    const periodLengths = cycles.filter(c => c.periodLength).map(c => c.periodLength);
    if (periodLengths.length > 0) {
      avgPeriodLength = Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length);
    }

    const lastCycle = cycles[0];
    const lastStart = new Date(lastCycle.startDate);

    // Predict next 3 periods
    const predictions = [];
    for (let i = 1; i <= 3; i++) {
      const nextStart = new Date(lastStart);
      nextStart.setDate(nextStart.getDate() + avgCycleLength * i);

      const nextEnd = new Date(nextStart);
      nextEnd.setDate(nextEnd.getDate() + avgPeriodLength);

      const ovulationDate = new Date(nextStart);
      ovulationDate.setDate(ovulationDate.getDate() - 14);

      const fertileStart = new Date(ovulationDate);
      fertileStart.setDate(fertileStart.getDate() - 5);

      const fertileEnd = new Date(ovulationDate);
      fertileEnd.setDate(fertileEnd.getDate() + 1);

      predictions.push({
        cycleNumber: i,
        predictedStartDate: nextStart,
        predictedEndDate: nextEnd,
        ovulationDate,
        fertileWindowStart: fertileStart,
        fertileWindowEnd: fertileEnd
      });
    }

    // Regularity analysis
    const irregularCycles = cycles.filter(c => c.isIrregular);
    const isIrregular = irregularCycles.length > 0;
    const irregularityAlert = isIrregular
      ? 'Your cycles show irregular patterns (outside 21-35 days). Consider consulting a healthcare provider.'
      : null;

    // Current cycle phase
    const today = new Date();
    const dayOfCycle = Math.round((today - lastStart) / (1000 * 60 * 60 * 24)) + 1;
    let currentPhase;
    if (dayOfCycle <= avgPeriodLength) currentPhase = 'menstrual';
    else if (dayOfCycle <= 13) currentPhase = 'follicular';
    else if (dayOfCycle <= 16) currentPhase = 'ovulation';
    else currentPhase = 'luteal';

    res.json({
      success: true,
      summary: {
        averageCycleLength: avgCycleLength,
        averagePeriodLength: avgPeriodLength,
        currentDayOfCycle: dayOfCycle,
        currentPhase,
        totalCyclesTracked: cycles.length,
        isIrregular,
        irregularityAlert
      },
      predictions
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;