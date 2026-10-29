import json
import unittest
from pathlib import Path

UNITS_FILE = Path(__file__).parent / "public" / "units.json"
RANGES = ("drones", "missiles", "guns")


class UnitsTest(unittest.TestCase):
    """units.json diisi tangan, jadi cek bentuknya supaya halaman perbandingan tidak rusak."""

    def test_every_unit_has_a_faction_altitude_and_at_least_one_range(self):
        data = json.loads(UNITS_FILE.read_text(encoding="utf-8"))
        for category in data["categories"]:
            self.assertTrue(category["id"] and category["name"])
            names = [u["name"] for u in category["units"]]
            self.assertEqual(len(names), len(set(names)), f"nama unit ganda di {category['id']}")
            for unit in category["units"]:
                with self.subTest(unit=unit["name"]):
                    self.assertTrue(unit["faction"])
                    self.assertGreater(unit["altitude"], 0)
                    values = [unit[k] for k in RANGES]
                    self.assertTrue(all(v is None or v > 0 for v in values))
                    self.assertTrue(any(v is not None for v in values))


if __name__ == "__main__":
    unittest.main()
