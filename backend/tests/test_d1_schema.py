"""Design-time SQLite FK/ownership schema checks. No live D1 database is accessed."""
from pathlib import Path
import sqlite3
import unittest

SQL = (Path(__file__).resolve().parents[1] / "migrations" / "0001_dajeongrok_d1.sql").read_text(encoding="utf-8")
DUMMY_IV = b"0123456789ab"
DUMMY_CT = b"encrypted-placeholder"

class D1SchemaTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.executescript(SQL)
        self.db.executemany("INSERT INTO app_users (id) VALUES (?)", [("u1",), ("u2",)])

    def tearDown(self):
        self.db.close()

    def entry(self, eid, owner, date="2026-12-01"):
        self.db.execute(
            "INSERT INTO diary_entries (id,user_id,entry_date,body_ciphertext,body_iv,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
            (eid,owner,date,DUMMY_CT,DUMMY_IV,"2026-12-01T12:00:00Z","2026-12-01T12:00:00Z")
        )

    def test_distinct_owners_same_day_and_fk(self):
        self.entry("e1","u1")
        self.entry("e2","u2")
        self.entry("e3","u1")
        self.assertEqual(self.db.execute("SELECT COUNT(DISTINCT entry_date) FROM diary_entries WHERE user_id=?",("u1",)).fetchone()[0],1)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM diary_entries WHERE user_id=?",("u2",)).fetchone()[0],1)
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO diary_entries(id,user_id,entry_date,body_ciphertext,body_iv,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",("e4","u9","2026-12-01",DUMMY_CT,DUMMY_IV,"x","x"))

    def test_reflection_cannot_attach_to_another_users_entry(self):
        self.entry("e1","u1")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(
                "INSERT INTO diary_reflections (id,user_id,entry_id,reflection_date,body_ciphertext,body_iv,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
                ("r1","u2","e1","2026-12-01",DUMMY_CT,DUMMY_IV,"x","x")
            )
        self.db.execute(
            "INSERT INTO diary_reflections (id,user_id,entry_id,reflection_date,body_ciphertext,body_iv,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
            ("r2","u1","e1","2026-12-01",DUMMY_CT,DUMMY_IV,"x","x")
        )
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM diary_reflections").fetchone()[0],1)

    def test_delete_account_removes_all_personal_rows_not_other_user(self):
        self.entry("e1","u1")
        self.entry("e2","u2")
        self.db.execute("INSERT INTO user_identities(provider,subject_hmac,user_id) VALUES ('toss_anonymous','hash1','u1')")
        self.db.execute("INSERT INTO app_sessions(token_sha256,user_id,expires_at) VALUES ('tokenhash','u1','2099-01-01')")
        self.db.execute("INSERT INTO monthly_artwork_seen(user_id,artwork_month,artwork_key) VALUES ('u1','2026-12','2026-12/snowflake-v1')")
        self.db.execute("DELETE FROM app_users WHERE id='u1'")
        for table in ["diary_entries","user_identities","app_sessions","monthly_artwork_seen"]:
            self.assertEqual(self.db.execute(f"SELECT COUNT(*) FROM {table} WHERE user_id='u1'").fetchone()[0],0)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM diary_entries WHERE user_id='u2'").fetchone()[0],1)

    def test_preferences_reject_unsupported_day_boundary(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO user_preferences(user_id,boundary_hour) VALUES ('u1',99)")

    def test_month_seen_version_is_unique(self):
        self.db.execute("INSERT INTO monthly_artwork_seen(user_id,artwork_month,artwork_key) VALUES ('u1','2026-12','2026-12/snowflake-v1')")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO monthly_artwork_seen(user_id,artwork_month,artwork_key) VALUES ('u1','2026-12','2026-12/snowflake-v1')")
        self.db.execute("INSERT INTO monthly_artwork_seen(user_id,artwork_month,artwork_key) VALUES ('u1','2026-12','2026-12/snowflake-v2')")

if __name__ == "__main__":
    unittest.main()
