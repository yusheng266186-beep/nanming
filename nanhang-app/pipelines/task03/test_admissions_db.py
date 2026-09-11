"""Behavioral tests for the admissions database build and its matching query.

The cleaning rules and the comparison rules are checked directly, including the cases
the project specification calls out: 0 versus missing, unverified tuition, historical
facts that must not inherit the plan row's track or batch, and UNKNOWN eligibility that
must not be merged into PASS or FAIL. No source workbook is modified.
"""
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

import build_admissions_db as build
import query_admissions as query

APP = Path(__file__).resolve().parents[2]
# The real built database, used by the tests that must run against official data.
REAL_DB = APP / "data/admissions/admissions.sqlite"


def cell(value, ref="A2", kind="s", formula=None, fmt=None):
    return {"cell": ref, "value": value, "raw_value": value, "cell_type": kind,
            "formula": formula, "number_format": fmt}


def clean(fields, track="PHYSICS"):
    issues = []
    row = build.clean_row(track, fields, "SRC-TEST", 2, issues)
    return row, issues


def issue_codes(issues):
    return {item[3] for item in issues}


class SubjectRuleTests(unittest.TestCase):
    def test_unlimited_stays_distinct_from_unknown(self):
        self.assertEqual(build.parse_requirement("不限"), ("unlimited", [], "PARSED"))
        self.assertEqual(build.parse_requirement(None)[0], "unknown")
        self.assertEqual(build.parse_requirement("物化生")[0], "unknown")

    def test_all_of_subjects_are_sorted_and_coded(self):
        kind, subjects, status = build.parse_requirement("化学和生物")
        self.assertEqual(kind, "all_of")
        self.assertEqual(subjects, ["BIOLOGY", "CHEMISTRY"])
        self.assertEqual(status, "PARSED")

    def test_separators_are_normalized(self):
        for raw in ("化学、生物", "化学，生物", "化学,生物", "化学 和 生物"):
            self.assertEqual(build.parse_requirement(raw)[1], ["BIOLOGY", "CHEMISTRY"], raw)

    def test_unknown_rule_never_becomes_a_pass(self):
        status, reasons = query.evaluate_subjects("unknown", [], {"CHEMISTRY", "BIOLOGY"}, True)
        self.assertEqual(status, "UNKNOWN")
        self.assertIn("UNKNOWN_REQUIREMENT", reasons)

    def test_unlimited_passes_even_with_two_unrelated_subjects(self):
        status, reasons = query.evaluate_subjects("unlimited", [], {"POLITICS", "GEOGRAPHY"}, True)
        self.assertEqual((status, reasons), ("PASS", []))

    def test_incomplete_selection_is_unknown_not_failed(self):
        status, reasons = query.evaluate_subjects("all_of", ["CHEMISTRY"], {"CHEMISTRY"}, False)
        self.assertEqual(status, "UNKNOWN")
        self.assertIn("INCOMPLETE_SUBJECTS", reasons)

    def test_missing_subject_is_a_failure(self):
        status, reasons = query.evaluate_subjects("all_of", ["CHEMISTRY"], {"POLITICS", "GEOGRAPHY"}, True)
        self.assertEqual(status, "FAIL")
        self.assertIn("SUBJECT_REQUIREMENT_FAILED", reasons)

    def test_three_valued_combination_prefers_fail_then_unknown(self):
        self.assertEqual(query.combine(["PASS", "UNKNOWN", "FAIL"]), "FAIL")
        self.assertEqual(query.combine(["PASS", "UNKNOWN"]), "UNKNOWN")
        self.assertEqual(query.combine(["PASS", "PASS"]), "PASS")


class RankComparisonTests(unittest.TestCase):
    def test_lower_rank_number_is_ahead(self):
        self.assertEqual(query.compare_rank(100, 500), "AHEAD_OF_REFERENCE")
        self.assertEqual(query.compare_rank(900, 500), "BEHIND_REFERENCE")

    def test_touching_the_boundary_is_overlap_not_ahead(self):
        self.assertEqual(query.compare_rank(500, 500), "OVERLAPS_REFERENCE")

    def test_missing_rank_is_not_comparable(self):
        self.assertEqual(query.compare_rank(None, 500), "NOT_COMPARABLE")
        self.assertEqual(query.compare_rank(500, None), "NOT_COMPARABLE")


class ScoreDistributionTests(unittest.TestCase):
    """Score-to-rank rules from the matching spec, exercised against the official table."""

    @classmethod
    def setUpClass(cls):
        cls.distribution_path = build.SCORE_DISTRIBUTION_PATH
        if not cls.distribution_path.exists():
            raise unittest.SkipTest("extracted score-distribution table not present")
        cls.payload = json.loads(cls.distribution_path.read_text(encoding="utf-8"))
        cls.connection = sqlite3.connect(f"file:{REAL_DB}?mode=ro", uri=True)
        cls.connection.row_factory = sqlite3.Row

    @classmethod
    def tearDownClass(cls):
        cls.connection.close()

    @property
    def tables(self):
        """Every published table in the extraction.

        The payload carries one entry per (year, track). 2025 起 are 物理类/历史类 and 2024 及以前
        are 理科/文科, so a test names the table it means instead of assuming a track is unique.
        """
        return self.payload["distributions"]

    def table(self, distribution_id):
        return next(item for item in self.tables if item["distribution_id"] == distribution_id)

    def test_every_published_table_is_present_with_its_range(self):
        expected = {
            "SCORE-DIST-SC-2026-PHYSICS": (150, 685),
            "SCORE-DIST-SC-2026-HISTORY": (151, 662),
            "SCORE-DIST-SC-2025-PHYSICS": (150, 691),
            "SCORE-DIST-SC-2025-HISTORY": (150, 663),
            "SCORE-DIST-SC-2024-SCIENCE": (150, 698),
            "SCORE-DIST-SC-2024-ARTS": (150, 639),
            "SCORE-DIST-SC-2023-SCIENCE": (100, 698),
        }
        self.assertEqual({item["distribution_id"] for item in self.tables}, set(expected))
        for distribution_id, bounds in expected.items():
            scores = [row["score"] for row in self.table(distribution_id)["rows"]]
            self.assertEqual((min(scores), max(scores)), bounds, distribution_id)

    def test_every_table_states_which_curriculum_system_it_belongs_to(self):
        for item in self.tables:
            year = int(item["distribution_id"].rsplit("-", 2)[-2])
            self.assertEqual(item.get("curriculum_system"),
                             "new_gaokao" if year >= 2025 else "old_system",
                             item["distribution_id"])

    def test_rank_interval_matches_the_stored_columns(self):
        for item in self.tables:
            rows = self.connection.execute(
                "SELECT score, count, cumulative, rank_best, rank_worst FROM v_score_distribution_row "
                "WHERE distribution_id = ?", (item["distribution_id"],)).fetchall()
            self.assertGreater(len(rows), 400, item["distribution_id"])
            for row in rows:
                where = f"{item['distribution_id']} {row['score']}"
                self.assertEqual(row["rank_worst"], row["cumulative"], where)
                if row["count"] is None:
                    self.assertIsNone(row["rank_best"])
                    continue
                self.assertEqual(row["rank_best"], row["cumulative"] - row["count"] + 1, where)
                self.assertGreaterEqual(row["rank_best"], 1, where)
                self.assertLessEqual(row["rank_best"], row["rank_worst"], where)

    def test_count_arithmetic_closes_for_every_adjacent_pair(self):
        for item in self.tables:
            rows = item["rows"]
            for above, below in zip(rows, rows[1:]):
                if None in (above["cumulative"], below["cumulative"], below["count"]):
                    continue
                self.assertEqual(below["cumulative"] - above["cumulative"], below["count"],
                                 f"{item['distribution_id']} {below['score']}")

    def test_derived_counts_record_their_arithmetic(self):
        derived = [row for item in self.tables for row in item["rows"]
                   if row.get("count_derived")]
        self.assertGreater(len(derived), 0, "expected some OCR-missed tallies to be recovered")
        for row in derived:
            self.assertTrue(row.get("count_derivation"))
            self.assertIn("cumulative(", row["count_derivation"])

    def test_unlisted_scores_are_recorded_not_interpolated(self):
        physics = self.table("SCORE-DIST-SC-2026-PHYSICS")
        self.assertEqual(physics["unlisted_scores"], [161, 153])
        listed = {row["score"] for row in physics["rows"]}
        self.assertNotIn(161, listed)

    def test_rows_read_off_the_image_keep_their_note(self):
        confirmed = [row for item in self.tables for row in item["rows"]
                     if row.get("count_verified_by_image")]
        self.assertEqual(len(confirmed), 2, "two rows were confirmed from the published images")
        for row in confirmed:
            self.assertTrue(row.get("count_verification_note"))
            self.assertIsInstance(row["count"], int)

    def test_locates_a_published_score(self):
        result = query.locate_rank(self.connection, "PHYSICS", 660, 2026)
        self.assertEqual(result["status"], "located")
        self.assertEqual(result["count"], 84)
        self.assertEqual(result["cumulative"], 1003)
        self.assertEqual(result["rank_interval"], [920, 1003])
        self.assertEqual(result["verification_status"], "VERIFIED")

    def test_unlisted_score_yields_no_rank(self):
        result = query.locate_rank(self.connection, "PHYSICS", 161, 2026)
        self.assertEqual(result["status"], "unavailable")
        self.assertEqual(result["reason"], "NO_OBSERVED_SCORE")
        self.assertIsNone(result["rank_interval"])

    def test_below_published_minimum_is_out_of_coverage(self):
        result = query.locate_rank(self.connection, "PHYSICS", 149, 2026)
        self.assertEqual(result["reason"], "OUT_OF_DISTRIBUTION_COVERAGE")
        self.assertIsNone(result["rank_interval"])

    def test_above_published_maximum_is_not_extrapolated(self):
        result = query.locate_rank(self.connection, "PHYSICS", 700, 2026)
        self.assertEqual(result["reason"], "ABOVE_PUBLISHED_RANGE")
        self.assertIsNone(result["rank_interval"])

    def test_unknown_year_has_no_distribution(self):
        # 2022 has no published table in this release; the same score must not silently borrow
        # another year's numbers.
        result = query.locate_rank(self.connection, "PHYSICS", 660, 2022)
        self.assertEqual(result["reason"], "NO_DISTRIBUTION_FOR_YEAR")

    def test_historical_years_use_their_own_curriculum_system(self):
        # 2024/2023 are 理科/文科 tables. The workbook files the physics sheet's history under
        # 理科 for those years, and that mapping is explicit rather than assumed.
        self.assertEqual(query.DISTRIBUTION_TRACK_BY_YEAR["PHYSICS"][2024], "SCIENCE")
        self.assertEqual(query.DISTRIBUTION_TRACK_BY_YEAR["PHYSICS"][2023], "SCIENCE")
        self.assertEqual(query.DISTRIBUTION_TRACK_BY_YEAR["HISTORY"][2024], "ARTS")
        self.assertEqual(query.DISTRIBUTION_TRACK_BY_YEAR["PHYSICS"][2025], "PHYSICS")
        result = query.locate_rank(self.connection, "PHYSICS", 660, 2025)
        self.assertEqual(result["status"], "located")
        self.assertEqual(result["distribution_id"], "SCORE-DIST-SC-2025-PHYSICS")
        self.assertEqual(result["cumulative"], 1834)
        self.assertNotEqual(result["cumulative"], 1003,
                            "2025 must not reuse the 2026 table's numbers")

    def test_rows_are_stored_with_evidence_coordinates(self):
        row = self.connection.execute(
            "SELECT * FROM v_score_distribution_row "
            "WHERE distribution_id = 'SCORE-DIST-SC-2026-PHYSICS' AND score = 660").fetchone()
        self.assertIsNotNone(row)
        self.assertEqual(row["cumulative"], 1003)
        self.assertIsNotNone(row["evidence_image"])
        self.assertAlmostEqual(len(row["image_sha256"]), 64)
        for key in ("score_x", "score_y", "count_x", "count_y", "cumulative_x", "cumulative_y"):
            self.assertIsNotNone(row[key], key)

    def test_every_table_is_marked_verified_with_a_stated_basis(self):
        rows = self.connection.execute("SELECT * FROM score_distribution").fetchall()
        self.assertEqual(len(rows), 7)
        for row in rows:
            self.assertEqual(row["verification_status"], "VERIFIED", row["distribution_id"])
            self.assertEqual(row["publisher"], "四川省教育考试院", row["distribution_id"])
            self.assertIn("NOT_STATED_ON_PUBLISHED_TABLE", row["score_basis_status"],
                          row["distribution_id"])
            self.assertGreaterEqual(row["head_group_above_max"], 0, row["distribution_id"])
            self.assertIsNotNone(row["curriculum_system"], row["distribution_id"])

    def test_total_population_reconciles_with_the_head_group(self):
        for item in self.tables:
            rows = self.connection.execute(
                "SELECT * FROM v_score_distribution_row WHERE distribution_id = ? "
                "ORDER BY score DESC", (item["distribution_id"],)).fetchall()
            total = sum(row["count"] for row in rows if row["count"] is not None)
            head = rows[0]["cumulative"] - rows[0]["count"]
            self.assertEqual(total + head, rows[-1]["cumulative"], item["distribution_id"])


class CleaningTests(unittest.TestCase):
    def test_zero_and_missing_stay_different(self):
        row, issues = clean({"26计划人数": cell("0", "R2"), "26学费": cell("0", "S2")})
        self.assertEqual(row["plan_count"], 0)
        self.assertEqual(row["tuition_amount"], 0.0)
        self.assertNotIn("NON_NUMERIC_NUMBER", issue_codes(issues))
        row, issues = clean({"26计划人数": cell(None, "R2")})
        self.assertIsNone(row["plan_count"])

    def test_rank_zero_is_invalid_and_keeps_the_row(self):
        issues = []
        records = build.history_observations(
            {"25最低分": cell("600", "AE2"), "25最低位次": cell("0", "AF2")},
            "SRC-TEST", 2, issues, "PHYSICS")
        self.assertEqual(len(records), 1)
        self.assertIsNone(records[0]["rank"])
        self.assertEqual(records[0]["rank_is_valid"], 0)
        self.assertIn("ZERO_RANK_INVALID", issue_codes(issues))

    def test_rank_zero_without_a_score_is_still_kept_as_unknown(self):
        issues = []
        records = build.history_observations({"24最低位次": cell("0", "AM2")}, "SRC-TEST", 2,
                                             issues, "PHYSICS")
        self.assertEqual(len(records), 1)
        self.assertIsNone(records[0]["rank"])
        self.assertEqual(records[0]["rank_is_valid"], 0)

    def test_historical_facts_never_inherit_the_plan_row(self):
        row, _issues = clean({"科类": cell("物理"), "批次": cell("本科批B段", "B2"),
                              "计划类别": cell("国家专项计划", "C2")})
        issues = []
        records = build.history_observations({"25专业组最低分": cell("600", "AB2")}, "SRC-TEST", 2,
                                             issues, "PHYSICS")
        self.assertIsNone(records[0]["observed_track"])
        self.assertIsNone(records[0]["observed_batch"])
        self.assertIsNone(records[0]["observed_admission_type"])
        self.assertIsNone(records[0]["score_basis"])
        self.assertEqual(records[0]["comparability"], "NOT_ESTABLISHED")
        self.assertEqual(row["batch"], "本科批B段")

    def test_tuition_keeps_raw_text_and_never_guesses_currency(self):
        row, issues = clean({"26学费": cell("待定", "S2")})
        self.assertIsNone(row["tuition_amount"])
        self.assertEqual(row["tuition_raw"], "待定")
        self.assertIn("TUITION_PENDING", issue_codes(issues))
        row, issues = clean({"26学费": cell("免费", "S2")})
        self.assertEqual(row["tuition_amount"], 0.0)
        self.assertIn("TUITION_MARKED_FREE", issue_codes(issues))
        row, _issues = clean({"26学费": cell("5000", "S2")})
        self.assertEqual(row["tuition_amount"], 5000.0)

    def test_formula_and_error_cells_are_not_values(self):
        row, issues = clean({"26计划人数": cell("3", "R2", formula="1+2"),
                             "26学费": cell("0", "S2", kind="e")})
        self.assertIsNone(row["plan_count"])
        self.assertIsNone(row["tuition_amount"])
        codes = issue_codes(issues)
        self.assertIn("FORMULA_NOT_EVALUATED", codes)
        self.assertIn("EXCEL_ERROR_VALUE", codes)

    def test_blank_admission_type_is_inferred_and_flagged(self):
        row, issues = clean({"计划类别": cell(None)})
        self.assertEqual(row["admission_type"], "普通类")
        self.assertEqual(row["admission_type_inferred"], 1)
        self.assertIn("ADMISSION_TYPE_BLANK_TREATED_AS_ORDINARY", issue_codes(issues))

    def test_chinese_track_label_is_not_a_conflict(self):
        _row, issues = clean({"科类": cell("物理")}, track="PHYSICS")
        self.assertNotIn("TRACK_CONFLICT", issue_codes(issues))
        _row, issues = clean({"科类": cell("历史")}, track="PHYSICS")
        self.assertIn("TRACK_CONFLICT", issue_codes(issues))

    def test_leading_zero_codes_survive(self):
        row, _issues = clean({"院校代码": cell("0003", "D2"), "专业代码": cell("09", "L2"),
                              "专业组代码": cell("101", "K2"), "专业名称": cell("文科试验班类", "M2")})
        self.assertEqual(row["institution_code"], "0003")
        self.assertEqual(row["major_code"], "09")

    def test_discipline_evaluation_rounds_are_split(self):
        self.assertEqual(build.parse_discipline_eval("四轮：A+；五轮：A+"), ("A+", "A+"))
        self.assertEqual(build.parse_discipline_eval("四轮：B"), ("B", None))
        self.assertEqual(build.parse_discipline_eval(None), (None, None))


class BuiltDatabaseTests(unittest.TestCase):
    """Build from a synthetic two-row workbook so the schema and views are exercised."""

    @classmethod
    def setUpClass(cls):
        cls._folder = tempfile.TemporaryDirectory()
        root = Path(cls._folder.name)
        for _track, sheet, name in build.INPUTS:
            cls._write_workbook(root / name, sheet)
        cls.output = root / "admissions.sqlite"
        cls.stats = build.build(root, cls.output, None)
        cls.connection = sqlite3.connect(cls.output)
        cls.connection.row_factory = sqlite3.Row

    @classmethod
    def tearDownClass(cls):
        cls.connection.close()
        cls._folder.cleanup()

    @staticmethod
    def _write_workbook(path, sheet):
        from zipfile import ZipFile
        headers = [
            "科类", "批次", "计划类别", "院校代码", "院校名称", "所在省", "城市", "院校标签",
            "公私性质", "院校专业组代码", "专业组代码", "专业代码", "专业名称", "专业备注",
            "其他备注", "选科要求", "专业层次", "本科/专科", "26计划人数", "26学费", "26学制",
            "26组内专业", "26专业组计划人数", "26组内专业数", "门类", "专业类", "新增",
            "25专业组录取人数", "25专业组最低分", "25专业组最低位次", "25录取人数", "25最低分",
            "25最低位次", "25平均分", "25平均位次", "25最高分", "25最高位次", "24录取人数",
            "24最低分", "24最低位次", "24平均分", "24平均位次", "23录取人数", "23最低分",
            "23最低位次", "23平均分", "23平均位次", "23最高分", "23最高位次",
        ]
        # Row A: resolvable subject rule with full history. Row B: 不限 with a pending
        # tuition and invalid zero ranks. Row C: blank requirement, which must stay UNKNOWN.
        rows = [
            ["物理" if sheet == "物理" else "历史", "本科批B段", None, "0001", "测试大学", "北京",
             "海淀区", "985/211", "公办", "0001101", "101", "01", "测试专业A", "(含：方向一)",
             "院校备注", "化学", "本科", "本科", "2", "5000", "4", "组内文本", "4", "2", "工学",
             "计算机类", "新增", "3", "690", "80", "2", "693", "59", "694", "59", "695", "59", "3",
             "700", "63", "702", "63", "3", "701", "43", "705", "25", "711", "12"],
            ["物理" if sheet == "物理" else "历史", "本科批B段", "国家专项计划", "0001", "测试大学",
             "北京", "海淀区", "985/211", "公办", "0001102", "102", "02", "测试专业B", None, None,
             "不限", "本科", "本科", "3", "待定", "4", None, "3", "1", "理学", "数学类", None, None,
             None, None, None, "0", "0", "0", "0", "0", "0", None, None, None, None, None, None,
             None, None, None, None, None, None],
            ["物理" if sheet == "物理" else "历史", "本科批B段", None, "0002", "测试学院", "上海",
             "杨浦区", "211", "公办", "0002101", "201", "03", "测试专业C", None, None,
             None, "本科", "本科", "1", "6000", "4", None, "1", "1", "文学", "外国语言文学类",
             None, None, None, None, None, None, None, None, None, None, None, None, None, None,
             None, None, None, None, None, None, None],
        ]
        letters = {}
        for index in range(len(headers)):
            letters[headers[index]] = column_letter(index)
        from xml.sax.saxutils import escape
        xml_rows = []
        header_cells = "".join(
            f'<c r="{letters[name]}1" t="inlineStr"><is><t>{escape(name)}</t></is></c>'
            for name in headers)
        xml_rows.append(f'<row r="1">{header_cells}</row>')
        for offset, values in enumerate(rows, start=2):
            cells = []
            for name, value in zip(headers, values):
                if value is None:
                    continue
                ref = f"{letters[name]}{offset}"
                if isinstance(value, str) and value.lstrip("-").isdigit() and len(value) > 1:
                    cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{escape(value)}</t></is></c>')
                elif isinstance(value, str):
                    cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{escape(value)}</t></is></c>')
                else:
                    cells.append(f'<c r="{ref}"><v>{value}</v></c>')
            xml_rows.append(f'<row r="{offset}">{"".join(cells)}</row>')
        with ZipFile(path, "w") as archive:
            archive.writestr("xl/workbook.xml",
                             f'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
                             f'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
                             f'<sheets><sheet name="{sheet}" sheetId="1" r:id="r1"/></sheets></workbook>')
            archive.writestr("xl/_rels/workbook.xml.rels",
                             '<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/></Relationships>')
            archive.writestr("xl/worksheets/sheet1.xml",
                             '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
                             f'<sheetData>{"".join(xml_rows)}</sheetData></worksheet>')

    def test_build_reports_success_and_no_duplicate_keys(self):
        self.assertEqual(self.stats["duplicate_offering_keys"], 0)
        self.assertEqual(self.stats["source_conflicts"], 0)
        self.assertEqual(self.stats["integrity_check"], "ok")

    def test_database_passes_integrity_and_foreign_keys(self):
        self.assertEqual(self.connection.execute("PRAGMA integrity_check").fetchone()[0], "ok")
        self.assertEqual(self.connection.execute("PRAGMA foreign_key_check").fetchall(), [])

    def test_every_offering_has_one_plan_record(self):
        orphans = self.connection.execute(
            "SELECT COUNT(*) FROM offering o LEFT JOIN plan_record p ON p.offering_pk = o.offering_pk "
            "WHERE p.plan_pk IS NULL").fetchone()[0]
        self.assertEqual(orphans, 0)

    def test_historical_rows_do_not_carry_the_plan_row_context(self):
        rows = self.connection.execute(
            "SELECT * FROM admission_observation WHERE observed_track IS NOT NULL "
            "OR observed_batch IS NOT NULL OR observed_admission_type IS NOT NULL").fetchall()
        self.assertEqual(rows, [])
        assumed = self.connection.execute(
            "SELECT DISTINCT batch_assumed_from_plan_row FROM v_observation_context").fetchall()
        self.assertEqual([row[0] for row in assumed], [1])

    def test_rank_zero_is_never_a_valid_rank(self):
        self.assertEqual(self.connection.execute(
            "SELECT COUNT(*) FROM admission_observation WHERE rank = 0 AND rank_is_valid = 1"
        ).fetchone()[0], 0)
        self.assertGreater(self.connection.execute(
            "SELECT COUNT(*) FROM admission_observation WHERE rank_is_valid = 0").fetchone()[0], 0)

    def test_evidence_cells_point_at_real_columns(self):
        row = self.connection.execute(
            "SELECT evidence_score_cell, evidence_rank_cell FROM v_observation "
            "WHERE metric_type = 'major_admission_min' AND source_year = 2025 LIMIT 1").fetchone()
        self.assertIsNotNone(row)
        self.assertTrue(row["evidence_score_cell"].endswith("2") or row["evidence_score_cell"].endswith("3"))
        header = self.connection.execute(
            "SELECT header_text FROM header_map WHERE column_letter = ?",
            (row["evidence_score_cell"].rstrip("0123456789"),)).fetchone()
        self.assertIn("最低分", header["header_text"])

    def test_match_pool_exposes_everything_matching_needs(self):
        row = self.connection.execute(
            "SELECT * FROM match_pool WHERE major_name = '测试专业A'").fetchone()
        for key in ("plan_count", "tuition_raw", "requirement_rule_kind", "major_rank_2025",
                    "major_rank_2024", "major_rank_2023", "group_rank_2025", "batch",
                    "admission_type", "level_label", "category", "source_row"):
            self.assertIn(key, row.keys())
            self.assertIsNotNone(row[key], key)

    def test_pending_tuition_is_null_and_keeps_its_text(self):
        row = self.connection.execute(
            "SELECT tuition_amount, tuition_raw, tuition_comparable FROM match_pool "
            "WHERE major_name = '测试专业B'").fetchone()
        self.assertIsNone(row["tuition_amount"])
        self.assertEqual(row["tuition_raw"], "待定")
        self.assertEqual(row["tuition_comparable"], 0)

    def test_matching_reads_back_the_stored_values(self):
        connection = sqlite3.connect(f"file:{self.output}?mode=ro", uri=True)
        connection.row_factory = sqlite3.Row
        try:
            rows = query.load_rows(connection, "PHYSICS", self._query_args())
        finally:
            connection.close()
        candidate = next(row for row in rows if row["major_name"] == "测试专业A")
        self.assertEqual(candidate["plan_count"], 2)
        self.assertEqual(candidate["major_rank_2025"], 59)
        self.assertEqual(candidate["major_score_2025"], 693.0)
        self.assertEqual(candidate["requirement_rule_kind"], "all_of")

    def test_indexed_filters_narrow_the_pool(self):
        connection = sqlite3.connect(f"file:{self.output}?mode=ro", uri=True)
        connection.row_factory = sqlite3.Row
        try:
            all_rows = query.load_rows(connection, "PHYSICS", self._query_args())
            filtered = query.load_rows(connection, "PHYSICS", self._query_args(category=["理学"]))
            budgeted = query.load_rows(connection, "PHYSICS", self._query_args(
                budget=5500, assume_tuition_rmb_per_year=True))
        finally:
            connection.close()
        self.assertEqual(len(all_rows), 3)
        self.assertTrue(all(row["category"] == "理学" for row in filtered))
        self.assertLess(len(filtered), len(all_rows))
        # An unknown amount must survive the budget filter so it can be reported, not dropped.
        self.assertIn("测试专业B", {row["major_name"] for row in budgeted})

    @staticmethod
    def _query_args(**overrides):
        base = dict(batch=None, level=None, category=None, institution_province=None,
                    admission_type=None, exclude_inferred_admission_type=False,
                    min_plan_count=None, max_plan_count=None, exclude_new=False,
                    has_history=False, budget=None, assume_tuition_rmb_per_year=False)
        return query.argparse.Namespace(**{**base, **overrides})

    def test_unresolved_requirement_is_recorded_as_an_issue(self):
        codes = {row[0] for row in self.connection.execute(
            "SELECT DISTINCT issue_code FROM data_issue")}
        self.assertIn("REQUIREMENT_UNRESOLVED", codes)
        self.assertIn("TUITION_PENDING", codes)


def column_letter(index):
    letters = ""
    index += 1
    while index:
        index, remainder = divmod(index - 1, 26)
        letters = chr(65 + remainder) + letters
    return letters


if __name__ == "__main__":
    unittest.main()
