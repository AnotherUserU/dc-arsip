import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import fetch_discord as fd


def msg(id_, ts="2026-10-29T03:00:00+00:00", **extra):
    base = {"id": str(id_), "channel_id": "1", "timestamp": ts, "type": 0,
            "author": {"username": "bot"}, "content": f"pesan {id_}"}
    base.update(extra)
    return base


class FetchTest(unittest.TestCase):
    def test_paginates_until_short_page_and_returns_oldest_first(self):
        pages = [
            [msg(i) for i in range(200, 100, -1)],  # Discord mengirim terbaru dulu
            [msg(201), msg(202)],
        ]
        with mock.patch.object(fd, "_request", side_effect=pages) as req:
            result = fd.fetch_new_messages("1", "100", "t")
        self.assertEqual([m["id"] for m in result][:2], ["101", "102"])
        self.assertEqual(result[-1]["id"], "202")
        self.assertIn("after=200", req.call_args_list[1].args[0])

    def test_empty_channel_returns_nothing(self):
        with mock.patch.object(fd, "_request", return_value=[]):
            self.assertEqual(fd.fetch_new_messages("1", "0", "t"), [])


class NormalizeTest(unittest.TestCase):
    def test_skips_system_and_empty_messages(self):
        self.assertFalse(fd.is_archivable(msg(1, type=7)))
        self.assertFalse(fd.is_archivable(msg(1, content="")))
        self.assertTrue(fd.is_archivable(msg(1, content="", embeds=[{"title": "x"}])))

    def test_keeps_embed_fields_and_external_image_url(self):
        m = msg(5, embeds=[{"title": "Judul", "url": "https://berita.example/a",
                            "image": {"url": "https://berita.example/a.jpg"}, "fields": []}])
        entry = fd.normalize(m, "berita")
        self.assertEqual(entry["channel"], "berita")
        self.assertEqual(entry["embeds"], [{"title": "Judul", "url": "https://berita.example/a",
                                            "image": "https://berita.example/a.jpg"}])

    def test_media_filename_cannot_escape_media_dir(self):
        self.assertNotIn("/", fd._safe_name("../../etc/passwd"))
        self.assertEqual(fd.keep_media("http://cdn.discordapp.com/x.png", "1"),
                         "http://cdn.discordapp.com/x.png")  # bukan https: tidak diunduh


class ArchiveTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        patcher = mock.patch.object(fd, "DATA_DIR", Path(self.tmp.name))
        patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(self.tmp.cleanup)

    def test_day_boundary_uses_wib(self):
        # 18:30 UTC tanggal 28 = 01:30 WIB tanggal 29
        self.assertEqual(fd.wib_day("2026-10-28T18:30:00+00:00"), "2026-10-29")

    def test_merge_dedups_by_id_and_keeps_order(self):
        e = lambda i: fd.normalize(msg(i), "berita")
        fd.merge_into_days([e(3), e(1)])
        fd.merge_into_days([e(2), e(3)])
        saved = json.loads((Path(self.tmp.name) / "2026-10-29.json").read_text(encoding="utf-8"))
        self.assertEqual([x["id"] for x in saved], ["1", "2", "3"])


if __name__ == "__main__":
    unittest.main()
