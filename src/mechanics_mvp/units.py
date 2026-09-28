"""Small unit conversion boundary for the MVP.

The solver never stores display units. All values entering the solver are
converted to SI base units: N, m, kg, Pa, rad.
"""

from __future__ import annotations

import re
from typing import Any


class UnitError(ValueError):
    """Raised when a quantity cannot be converted to SI."""


UNIT_FACTORS: dict[str, float] = {
    "": 1.0,
    "1": 1.0,
    "N": 1.0,
    "kN": 1_000.0,
    "MN": 1_000_000.0,
    "m": 1.0,
    "cm": 1e-2,
    "mm": 1e-3,
    "rad": 1.0,
    "deg": 3.141592653589793 / 180.0,
    "Pa": 1.0,
    "kPa": 1_000.0,
    "MPa": 1_000_000.0,
    "GPa": 1_000_000_000.0,
    "N*m": 1.0,
    "kN*m": 1_000.0,
    "N/m": 1.0,
    "kN/m": 1_000.0,
    "MN/m": 1_000_000.0,
    "N/mm": 1_000.0,
    "N*m/m": 1.0,
    "kN*m/m": 1_000.0,
    "m^2": 1.0,
    "cm^2": 1e-4,
    "mm^2": 1e-6,
    "m^3": 1.0,
    "cm^3": 1e-6,
    "mm^3": 1e-9,
    "m^4": 1.0,
    "cm^4": 1e-8,
    "mm^4": 1e-12,
}

_QUANTITY_RE = re.compile(
    r"^\s*(?P<value>[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)"
    r"(?:\s*(?P<unit>[A-Za-z0-9_*/^.\-]+))?\s*$"
)


def to_si(quantity: Any, *, default_unit: str = "") -> float:
    """Convert a JSON-friendly quantity to an SI float.

    Accepted forms:
    - `12.5`: already SI, unless `default_unit` is provided.
    - `"12.5 kN"`: string with value and unit.
    - `{"value": 12.5, "unit": "kN"}`: explicit object form.
    """

    if isinstance(quantity, bool):
        raise UnitError("Boolean values are not valid physical quantities.")

    if isinstance(quantity, (int, float)):
        return float(quantity) * factor(default_unit)

    if isinstance(quantity, str):
        match = _QUANTITY_RE.match(quantity)
        if not match:
            raise UnitError(f"Invalid quantity string: {quantity!r}")
        unit = match.group("unit") or default_unit
        return float(match.group("value")) * factor(unit)

    if isinstance(quantity, dict):
        if "value" not in quantity:
            raise UnitError(f"Quantity object is missing 'value': {quantity!r}")
        unit = str(quantity.get("unit", default_unit))
        return to_si(quantity["value"], default_unit=unit)

    raise UnitError(f"Unsupported quantity type: {type(quantity).__name__}")


def factor(unit: str) -> float:
    normalized = normalize_unit(unit)
    try:
        return UNIT_FACTORS[normalized]
    except KeyError as exc:
        raise UnitError(f"Unsupported unit: {unit!r}") from exc


def normalize_unit(unit: str) -> str:
    return unit.strip().replace(" ", "").replace("·", "*")


def from_si(value: float, unit: str) -> float:
    """Convert an SI value to a display unit."""

    return float(value) / factor(unit)

