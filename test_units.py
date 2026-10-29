import json
import unittest
from pathlib import Path

UNITS_FILE = Path(__file__).parent / "public" / "units.json"
RANGES = ("drones", "missiles", "guns")


class UnitsTest(unittest.TestCase):
    """units.json diisi tangan, jadi cek bentuknya supaya halaman perbandingan tidak rusak."""

    def test_every_unit_has_faction_category_altitude_and_a_range(self):
        data = json.loads(UNITS_FILE.read_text(encoding="utf-8"))
        for unit_type in data["types"]:
            self.assertTrue(unit_type["id"] and unit_type["name"])
            names = [u["name"] for u in unit_type["units"]]
            self.assertEqual(len(names), len(set(names)), f"nama unit ganda di {unit_type['id']}")
            for unit in unit_type["units"]:
                with self.subTest(unit=unit["name"]):
                    self.assertTrue(unit["faction"] and unit["category"])
                    self.assertGreater(unit["altitude"], 0)
                    values = [unit[k] for k in RANGES]
                    self.assertTrue(all(v is None or v > 0 for v in values))
                    self.assertTrue(any(v is not None for v in values))


if __name__ == "__main__":
    unittest.main()
