import json
import unittest
from pathlib import Path

import build_game_data as gd

GAME_FILE = Path(__file__).parent / "public" / "data" / "game.json"
SECTIONS = ["bangunan", "upgrade", "air-defense", "militer", "zona", "politik", "glosarium"]


class HelperTest(unittest.TestCase):
    def test_to_number_reads_plain_numbers_only(self):
        self.assertEqual(gd.to_number("175000"), 175000)
        self.assertEqual(gd.to_number("93.6"), 93.6)
        self.assertIsNone(gd.to_number("4 x 4"))
        self.assertIsNone(gd.to_number("x1.06"))

    def test_clean_text_removes_own_account_amounts(self):
        text = "7500 steel to build, from your Steelworks or factories (you have 12000) · PLACEMENT"
        self.assertEqual(gd.clean_text(text), "7500 steel to build, from your Steelworks or factories · PLACEMENT")


class GameJsonTest(unittest.TestCase):
    """game.json dipublikasikan di repo publik: pastikan bentuknya benar dan tidak ada data pribadi."""

    @classmethod
    def setUpClass(cls):
        cls.raw = GAME_FILE.read_text(encoding="utf-8")
        cls.data = json.loads(cls.raw)

    def test_has_all_sections_with_both_languages(self):
        self.assertRegex(self.data["updated"], r"^\d{4}-\d{2}-\d{2}$")
        self.assertEqual([s["id"] for s in self.data["sections"]], SECTIONS)
        for section in self.data["sections"]:
            self.assertTrue(section["title"]["id"] and section["title"]["en"])
            self.assertTrue(section.get("tables") or section.get("items"))

    def test_rows_match_columns(self):
        for section in self.data["sections"]:
            for table in section.get("tables", []):
                for row in table["rows"]:
                    self.assertEqual(len(row), len(table["columns"]), table["id"])

    def test_no_private_or_internal_data(self):
        lowered = self.raw.lower()
        for forbidden in ("you have", "stockattribute", "weaponquest_", "rowhouse", "userid", "player"):
            self.assertNotIn(forbidden, lowered)


if __name__ == "__main__":
    unittest.main()
