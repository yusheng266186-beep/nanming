import hashlib
import unittest
from import_class4_codes import match_codes, suffix
from export_identity import build_entries

class CodesTest(unittest.TestCase):
    def test_suffix_text_zero_and_x(self):
        self.assertEqual(suffix('0' * 12 + '01234x'), '012340')
        with self.assertRaises(ValueError):
            suffix(123456789012345678)

    def test_only_target_class_and_revoke_old(self):
        old = hashlib.sha256(b'999999').hexdigest()
        people = [('a', '合成甲', 4, old), ('b', '合成乙', 5, old), ('c', '合成丙', 4, old)]
        overrides = match_codes([('合成甲', '0' * 12 + '01234X')], people)
        before = build_entries(people, {})
        after = build_entries(people, overrides)
        self.assertEqual(len(after), 3)
        self.assertEqual(len(before.keys() - after.keys()), 1)
        self.assertEqual(len(after.keys() - before.keys()), 1)
        self.assertEqual(set(before.values()), set(after.values()))
        with self.assertRaises(ValueError):
            match_codes([('合成乙', '0' * 18)], people)

    def test_ambiguous_identity_fails_closed(self):
        people = [('a', '同名', 4, 'a' * 64), ('b', '同名', 4, 'b' * 64)]
        with self.assertRaises(ValueError):
            match_codes([('同名', '0' * 18)], people)
        with self.assertRaises(ValueError):
            build_entries([('a', '同名', 4, 'a' * 64), ('b', '同名', 4, 'b' * 64)], {'a':'c'*64, 'b':'c'*64})

    def test_suffix_collision_keeps_name_binding(self):
        people = [('a', '合成甲', 4, 'a' * 64), ('b', '合成乙', 4, 'b' * 64)]
        overrides = match_codes([('合成甲', '0' * 12 + '01234X'), ('合成乙', '0' * 12 + '012340')], people)
        self.assertEqual(overrides['a'], overrides['b'])
        self.assertEqual(len(build_entries(people, overrides)), 2)

if __name__ == '__main__':
    unittest.main()
