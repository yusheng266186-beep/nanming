"""Behavioral tests for XLSX intake; no real workbooks are modified."""
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
from extract_workbook_samples import Workbook, identifier, number, resolve_cell, normalized_row


def cell(value, ref="A2", kind="s", formula=None, fmt=None):
    return {"cell": ref, "value": value, "raw_value": value, "cell_type": kind, "formula": formula, "number_format": fmt}


class WorkbookIntakeTests(unittest.TestCase):
    def test_preserves_zero_blank_codes_and_number_format(self):
        self.assertEqual(number(cell("0"), True), 0)
        self.assertIsNone(number(cell("")))
        self.assertIsNone(number(cell("待定")))
        self.assertIsNone(number(cell("3.5"), True))
        self.assertIsNone(number(cell("9" * 400)))
        self.assertEqual(identifier(cell("0003")), "0003")
        self.assertEqual(identifier(cell("3", kind="n", fmt="0000")), "0003")

    def test_formula_cache_and_excel_error_are_not_numeric_facts(self):
        self.assertIsNone(number(cell("900", formula="SUM(B2:C2)")))
        self.assertIsNone(number(cell("0", kind="e")))
        record = normalized_row("PHYSICS", "物理", 2, {"26计划人数": cell("3", formula="1+2")}, "f" * 64)
        self.assertIsNone(record["plan"]["plan_count"])
        self.assertIn("FORMULA_NOT_EVALUATED:26计划人数", record["warnings"])

    def test_merge_only_resolves_explicit_range_and_keeps_anchor(self):
        anchors = {"D2": cell("0003", "D2")}
        result = resolve_cell("D", 3, {}, ["D2:D3"], anchors)
        self.assertEqual(result["value"], "0003")
        self.assertEqual(result["cell"], "D3")
        self.assertEqual(result["merged_anchor"], "D2")
        self.assertIsNone(resolve_cell("D", 4, {}, ["D2:D3"], anchors))

    def test_year_metric_and_track_are_not_backfilled(self):
        record = normalized_row("PHYSICS", "物理", 2, {
            "科类": cell("历史"), "25专业组最低分": cell("600", "AB2"),
            "24最低分": cell("601", "AL2"), "24最低位次": cell("0", "AM2"),
        }, "f" * 64)
        self.assertIn("TRACK_CONFLICT", record["warnings"])
        group, major = record["historical_observations"]
        self.assertEqual((group["source_year"], group["metric_type"]), (2025, "group_admission_min"))
        self.assertEqual((major["source_year"], major["metric_type"]), (2024, "major_admission_min"))
        self.assertIsNone(major["rank"])
        self.assertIsNone(major["historical_track"])
        self.assertEqual(record["human_review_status"], "PENDING")
        self.assertNotEqual(record["publication_status"], "PUBLISHED")

    def test_resolves_sheet_relationship_instead_of_sheet1(self):
        with TemporaryDirectory() as folder:
            path = Path(folder) / "test.xlsx"
            with ZipFile(path, "w") as z:
                z.writestr("xl/workbook.xml", '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="历史" sheetId="8" r:id="r8"/></sheets></workbook>')
                z.writestr("xl/_rels/workbook.xml.rels", '<Relationships><Relationship Id="r8" Target="worksheets/actual.xml"/></Relationships>')
                z.writestr("xl/worksheets/actual.xml", '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="2"><c r="D2" t="inlineStr"><is><t>0003</t></is></c><c r="R2"><f>1+2</f><v>3</v></c></row></sheetData><mergeCells><mergeCell ref="D2:D3"/></mergeCells></worksheet>')
            book = Workbook(path)
            try:
                self.assertEqual(book.layout("历史")["merged_ranges"], ["D2:D3"])
                row = next(book.rows("历史"))[1]
                self.assertEqual(identifier(row["D"]), "0003")
                self.assertIsNone(number(row["R"]))
            finally:
                book.close()


if __name__ == "__main__":
    unittest.main()
