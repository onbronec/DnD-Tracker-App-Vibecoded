// DM-facing encounter difficulty thresholds. Change these values to tune the
// planner for this campaign; they are supplied to clients as read-only state.
const ENCOUNTER_DIFFICULTY = Object.freeze({
    easyMax: 10,
    mediumMax: 13,
    hardMin: 14,
    barMaximum: 20,
    hpPerPoint: 150,
    dprPerPointMin: 80,
    dprPerPointMax: 100
});

module.exports = { ENCOUNTER_DIFFICULTY };
