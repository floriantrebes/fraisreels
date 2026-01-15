"""Application constants and tax scales."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MileageBracket:
    """Represents a tax scale bracket for mileage deductions.

    Attributes:
        max_km: Inclusive maximum km for the bracket. None means no limit.
        rate: Rate applied to kilometers.
        fixed: Fixed amount added to the calculation.
    """

    max_km: int | None
    rate: float
    fixed: float


MILEAGE_SCALE = {
    3: [
        MileageBracket(max_km=5000, rate=0.529, fixed=0.0),
        MileageBracket(max_km=20000, rate=0.316, fixed=1065.0),
        MileageBracket(max_km=None, rate=0.370, fixed=0.0),
    ],
    4: [
        MileageBracket(max_km=5000, rate=0.606, fixed=0.0),
        MileageBracket(max_km=20000, rate=0.340, fixed=1330.0),
        MileageBracket(max_km=None, rate=0.407, fixed=0.0),
    ],
    5: [
        MileageBracket(max_km=5000, rate=0.636, fixed=0.0),
        MileageBracket(max_km=20000, rate=0.357, fixed=1395.0),
        MileageBracket(max_km=None, rate=0.427, fixed=0.0),
    ],
    6: [
        MileageBracket(max_km=5000, rate=0.665, fixed=0.0),
        MileageBracket(max_km=20000, rate=0.374, fixed=1457.0),
        MileageBracket(max_km=None, rate=0.447, fixed=0.0),
    ],
    7: [
        MileageBracket(max_km=5000, rate=0.697, fixed=0.0),
        MileageBracket(max_km=20000, rate=0.394, fixed=1515.0),
        MileageBracket(max_km=None, rate=0.470, fixed=0.0),
    ],
}

MAX_CV = 7

MEAL_MINIMUM_COST = 5.20
MEAL_MAXIMUM_COST = 19.40
