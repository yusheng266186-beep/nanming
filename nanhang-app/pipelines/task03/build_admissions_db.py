"""Build the offline admissions SQLite database from the two read-only workbooks.

Read-only on the source XLSX; writes one regenerable SQLite file. The schema follows
docs/TASK03_ADMISSIONS_DB.md and the handoff data model in
nanhang-handoff/DATA_AND_MATCHING_SPEC.md.

Cleaning rules that must not be relaxed:
  * codes stay text; leading zeros survive
  * 0 and missing stay different values; rank 0 is invalid, never a real rank
  * formulas are never executed; error values never become 0
  * tuition keeps its raw text because currency and billing period are unverified
  * historical observations keep track/batch/admission type unknown; the plan row's
    values are never written back onto the earlier year
  * every excluded or unrecognized value is recorded in data_issue instead of
    being silently repaired

Fact tables key on INTEGER surrogates so the 265k observation rows stay small; every
object keeps its readable text id as a UNIQUE column, and the v_* views join them back
for audit and evidence work. Row insertion order is the workbook scan order, so ids and
the resulting file are deterministic for a given source hash and SQLite version.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import sys
from pathlib import Path

APP = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from extract_workbook_samples import INPUTS, Workbook, identifier, merge_index, number, resolve_cell, text  # noqa: E402

PLAN_YEAR = 2026
PLAN_YEAR_PREFIX = "26"
HISTORY_YEARS = (2025, 2024, 2023)
PROVINCE = "SC"
SCHEMA_VERSION = "1.0.0"
RULES_VERSION = "nh-rules-1.0.0"

COLUMNS = {
    "track_declared": "科类",
    "batch": "批次",
    "admission_type": "计划类别",
    "institution_code": "院校代码",
    "institution_name": "院校名称",
    "province": "所在省",
    "city": "城市",
    "institution_labels": "院校标签",
    "ownership": "公私性质",
    "group_compound_code": "院校专业组代码",
    "group_code": "专业组代码",
    "major_code": "专业代码",
    "major_name": "专业名称",
    "major_note": "专业备注",
    "other_note": "其他备注",
    "subject_requirement": "选科要求",
    "degree_level": "专业层次",
    "plan_count": f"{PLAN_YEAR_PREFIX}计划人数",
    "tuition": f"{PLAN_YEAR_PREFIX}学费",
    "study_years": f"{PLAN_YEAR_PREFIX}学制",
    "group_majors": f"{PLAN_YEAR_PREFIX}组内专业",
    "group_plan_count": f"{PLAN_YEAR_PREFIX}专业组计划人数",
    "group_major_count": f"{PLAN_YEAR_PREFIX}组内专业数",
    "category": "门类",
    "category_class": "专业类",
    "is_new": "新增",
    "city_tier": "城市水平标签",
    "institution_level": "院校水平",
    "rename_history": "更名合并转设",
    "affiliation": "隶属单位",
    "institution_type": "类型",
    "level_label": "本科/专科",
    "postgraduate_rate": "保研率",
    "institution_ranking": "院校排名",
    "master_program_count": "全校硕士专业数",
    "master_programs": "全校硕士专业",
    "doctor_program_count": "全校博士专业数",
    "doctor_programs": "全校博士专业",
    "admission_rule": "录取规则",
    "charter_url": "招生章程",
    "academic_grade": "软科评级",
    "academic_ranking": "软科排名",
    "discipline_eval": "学科评估",
    "major_level": "专业水平",
    "major_master_programs": "本专业硕士点",
    "major_doctor_programs": "本专业博士点",
}

# (subject_type, metric_type, score column, rank column, admitted-count column)
HISTORY_METRICS = {
    2025: [
        ("group", "group_admission_min", "25专业组最低分", "25专业组最低位次", "25专业组录取人数"),
        ("major", "major_admission_min", "25最低分", "25最低位次", "25录取人数"),
        ("major", "major_admission_mean", "25平均分", "25平均位次", None),
        ("major", "major_admission_max", "25最高分", "25最高位次", None),
    ],
    2024: [
        ("major", "major_admission_min", "24最低分", "24最低位次", "24录取人数"),
        ("major", "major_admission_mean", "24平均分", "24平均位次", None),
    ],
    2023: [
        ("major", "major_admission_min", "23最低分", "23最低位次", "23录取人数"),
        ("major", "major_admission_mean", "23平均分", "23平均位次", None),
        ("major", "major_admission_max", "23最高分", "23最高位次", None),
    ],
}

SUBJECT_CODES = {"化学": "CHEMISTRY", "生物": "BIOLOGY", "政治": "POLITICS", "地理": "GEOGRAPHY"}

SCORE_DISTRIBUTION_PATH = APP / "data/task03/score-distribution/score-distribution.json"
SCORE_DISTRIBUTION_REGISTER = APP / "data/task03/score-distribution-register.json"
# The published table does not print a scoring-basis line. 高考总分 is the basis the table
# serves, so it is recorded that way but marked as convention, not as a stated fact.
SCORE_DISTRIBUTION_BASIS = "gaokao_cultural"
SCORE_DISTRIBUTION_BASIS_STATUS = "NOT_STATED_ON_PUBLISHED_TABLE; assigned as the table's published purpose"

# The 科类 column spells the track in Chinese; the worksheet name is the configured
# source of truth. Only a value outside this table is a real conflict.
TRACK_LABELS = {"物理": "PHYSICS", "历史": "HISTORY"}

# Which published table a plan track's history is filed under, per year. The workbook keeps
# 2023/2024 history on the same sheet as the plan year, so the physics sheet carries 理科 numbers
# for those years. Kept next to the comparability records because the two must agree: a year is
# only comparable when the history column and the plan row describe the same exam system.
HISTORICAL_TRACKS = {
    "PHYSICS": {2025: "PHYSICS", 2024: "SCIENCE", 2023: "SCIENCE"},
    "HISTORY": {2025: "HISTORY", 2024: "ARTS", 2023: "ARTS"},
}

# Filled by establish_comparability() before the rows are cleaned, so each history observation
# can read the decision instead of assuming one. Keyed by (history_year, history_track).
_COMPARABILITY_STATUS: dict[tuple[int, str], str] = {}

# The comparability decision for 2025↔2026: same curriculum system, so the track names mean the
# same thing, and both years have an official table. Recorded with what was examined and — just as
# importantly — what was not, so the limits travel with the claim.
COMPARABILITY_REVIEWER = "数据提供方（用户）"
COMPARABILITY_REVIEW_DATE = "2026-09-11"
COMPARABILITY_EVIDENCE = "data/task03/score-distribution/workbook-crosscheck.json"
COMPARABILITY_BASIS_SAME_SYSTEM = (
    "同为四川省 3+1+2 新高考口径（2025 起），物理类/历史类定义一致；"
    "该年官方一分一段表已入库且算术闭合；工作簿该年历史列与本计划行同表同组，"
    "全部位次经官方分段表区间交叉复核，0 条越界")
COMPARABILITY_EXAMINED = (
    "科类口径一致（新高考 3+1+2）；该年官方分段表覆盖与闭合；"
    "该年位次与官方区间逐条交叉复核；工作簿历史列与计划行的关联方式")
COMPARABILITY_NOT_EXAMINED = (
    "专业组跨年重组（工作簿无结构化记录，仅有院校更名合并转设文本列）；"
    "招生计划口径调整、批次或投档规则变化；院校更名/合并后的主体同一性")
COMPARABILITY_BASIS_DIFFERENT_SYSTEM = (
    "2024 及以前为文理分科口径（理科/文科），与计划年的物理类/历史类不是同一定义；"
    "来源未逐行给出该年的科类定义")

# Issues that repeat identically on every row of a source are aggregated into one row
# with a count, so data_issue stays readable. Per-row issues are reserved for values
# that genuinely differ between rows.
AGGREGATED_ISSUES = {
    "TRACK_FROM_EXPLICIT_SHEET_MAPPING",
    "ADMISSION_TYPE_BLANK_TREATED_AS_ORDINARY",
    "TUITION_CURRENCY_PERIOD_UNKNOWN",
}

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE source_document (
  source_pk INTEGER PRIMARY KEY,
  source_id TEXT NOT NULL UNIQUE,
  path TEXT NOT NULL, sha256 TEXT NOT NULL, size_bytes INTEGER NOT NULL,
  worksheet TEXT NOT NULL, track TEXT NOT NULL, header_row INTEGER NOT NULL,
  data_rows INTEGER NOT NULL, source_authority TEXT NOT NULL, source_scope TEXT NOT NULL
);

CREATE TABLE header_map (
  source_pk INTEGER NOT NULL REFERENCES source_document(source_pk),
  field_name TEXT NOT NULL, column_letter TEXT, header_text TEXT NOT NULL,
  PRIMARY KEY (source_pk, field_name)
);

CREATE TABLE release (
  release_id TEXT PRIMARY KEY, schema_version TEXT NOT NULL, rules_version TEXT NOT NULL,
  plan_year INTEGER NOT NULL, publication_status TEXT NOT NULL,
  human_review_performed INTEGER NOT NULL, notes TEXT NOT NULL
);

CREATE TABLE institution (
  institution_pk INTEGER PRIMARY KEY,
  institution_id TEXT NOT NULL UNIQUE,
  institution_code TEXT NOT NULL UNIQUE,
  canonical_name TEXT NOT NULL, province TEXT, city TEXT, city_tier TEXT, ownership TEXT,
  institution_type TEXT, level_label TEXT, affiliation TEXT, institution_ranking INTEGER,
  academic_ranking INTEGER, academic_grade TEXT, postgraduate_rate REAL,
  master_program_count INTEGER, doctor_program_count INTEGER,
  master_programs TEXT, doctor_programs TEXT, rename_history TEXT,
  institution_level TEXT, admission_rule TEXT, charter_url TEXT,
  source_pk INTEGER NOT NULL REFERENCES source_document(source_pk), first_source_row INTEGER NOT NULL
);

CREATE TABLE institution_tag (
  institution_pk INTEGER NOT NULL REFERENCES institution(institution_pk),
  tag_kind TEXT NOT NULL, tag TEXT NOT NULL,
  PRIMARY KEY (institution_pk, tag_kind, tag)
);

CREATE TABLE admission_group (
  group_pk INTEGER PRIMARY KEY,
  group_id TEXT NOT NULL UNIQUE,
  institution_pk INTEGER NOT NULL REFERENCES institution(institution_pk),
  track TEXT NOT NULL, plan_year INTEGER NOT NULL, province TEXT NOT NULL,
  batch TEXT NOT NULL, stage TEXT, admission_type TEXT NOT NULL,
  admission_type_raw TEXT, admission_type_inferred INTEGER NOT NULL,
  group_code TEXT NOT NULL, group_compound_code TEXT,
  group_major_count INTEGER, group_plan_count INTEGER, group_majors_raw TEXT,
  source_pk INTEGER NOT NULL REFERENCES source_document(source_pk), source_row INTEGER NOT NULL,
  UNIQUE (institution_pk, track, batch, group_code)
);

CREATE TABLE offering (
  offering_pk INTEGER PRIMARY KEY,
  offering_id TEXT NOT NULL UNIQUE,
  group_pk INTEGER NOT NULL REFERENCES admission_group(group_pk),
  major_code TEXT NOT NULL, major_name TEXT NOT NULL, major_note TEXT, other_note TEXT,
  degree_level TEXT, level_label TEXT, category TEXT, category_class TEXT,
  is_new INTEGER NOT NULL, major_master_programs TEXT, major_doctor_programs TEXT,
  source_pk INTEGER NOT NULL REFERENCES source_document(source_pk), source_row INTEGER NOT NULL,
  UNIQUE (group_pk, major_code)
);

CREATE TABLE offering_tag (
  offering_pk INTEGER NOT NULL REFERENCES offering(offering_pk),
  tag_kind TEXT NOT NULL, tag TEXT NOT NULL,
  PRIMARY KEY (offering_pk, tag_kind, tag)
);

CREATE TABLE requirement (
  requirement_pk INTEGER PRIMARY KEY,
  requirement_id TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL CHECK (scope IN ('group','offering')),
  group_pk INTEGER REFERENCES admission_group(group_pk),
  offering_pk INTEGER REFERENCES offering(offering_pk),
  plan_year INTEGER NOT NULL, raw_text TEXT, rule_kind TEXT NOT NULL,
  subjects TEXT NOT NULL, parse_status TEXT NOT NULL,
  source_pk INTEGER NOT NULL REFERENCES source_document(source_pk), source_row INTEGER NOT NULL,
  CHECK ((scope = 'group' AND group_pk IS NOT NULL AND offering_pk IS NULL)
      OR (scope = 'offering' AND offering_pk IS NOT NULL AND group_pk IS NULL))
);

CREATE TABLE plan_record (
  plan_pk INTEGER PRIMARY KEY,
  plan_id TEXT NOT NULL UNIQUE,
  offering_pk INTEGER NOT NULL UNIQUE REFERENCES offering(offering_pk),
  plan_year INTEGER NOT NULL, plan_count INTEGER,
  group_plan_count INTEGER, group_major_count INTEGER,
  tuition_amount REAL, tuition_raw TEXT, tuition_note TEXT,
  tuition_currency TEXT, tuition_period TEXT, tuition_comparable INTEGER NOT NULL,
  study_years REAL,
  requirement_pk INTEGER REFERENCES requirement(requirement_pk),
  source_pk INTEGER NOT NULL REFERENCES source_document(source_pk), source_row INTEGER NOT NULL,
  evidence_plan_count_cell TEXT, evidence_tuition_cell TEXT, evidence_requirement_cell TEXT
);

CREATE TABLE admission_observation (
  observation_pk INTEGER PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('group','major')),
  group_pk INTEGER REFERENCES admission_group(group_pk),
  offering_pk INTEGER REFERENCES offering(offering_pk),
  source_year INTEGER NOT NULL, metric_type TEXT NOT NULL,
  score REAL, rank INTEGER, rank_is_valid INTEGER NOT NULL, admitted_count INTEGER,
  observed_track TEXT, observed_batch TEXT, observed_admission_type TEXT,
  score_basis TEXT, comparability TEXT NOT NULL,
  source_pk INTEGER NOT NULL REFERENCES source_document(source_pk), source_row INTEGER NOT NULL,
  CHECK ((subject_type = 'group' AND group_pk IS NOT NULL AND offering_pk IS NULL)
      OR (subject_type = 'major' AND offering_pk IS NOT NULL AND group_pk IS NULL))
);

CREATE UNIQUE INDEX uq_observation_key ON admission_observation (
  source_year, metric_type, COALESCE(group_pk, -1), COALESCE(offering_pk, -1)
);
CREATE INDEX idx_observation_offering ON admission_observation (offering_pk, source_year, metric_type)
  WHERE offering_pk IS NOT NULL;
CREATE INDEX idx_observation_group ON admission_observation (group_pk, source_year, metric_type)
  WHERE group_pk IS NOT NULL;
CREATE INDEX idx_observation_reference ON admission_observation (metric_type, source_year, rank);

-- The worksheet columns the history metrics were read from. Evidence cell addresses are
-- stored once per metric per year here and derived in v_observation, instead of repeating
-- the score/rank column text on all 265k observation rows. source_row carries the rest.
CREATE TABLE history_column_map (
  source_year INTEGER NOT NULL,
  metric_type TEXT NOT NULL,
  score_column TEXT NOT NULL,
  rank_column TEXT NOT NULL,
  admitted_count_column TEXT,
  score_column_letter TEXT,
  rank_column_letter TEXT,
  PRIMARY KEY (source_year, metric_type)
);

-- Cross-year comparability. The project spec requires an explicit link before two years may be
-- compared, and states that an algorithm's suggestion is not a human review. So this table
-- records, per (plan year, plan track) -> (history year, published track), whether the comparison
-- is established, who established it, on what basis, and what could not be checked. A year with
-- no VERIFIED row here is never presented as comparable.
CREATE TABLE comparability_link (
  link_pk INTEGER PRIMARY KEY,
  link_id TEXT NOT NULL UNIQUE,
  plan_year INTEGER NOT NULL,
  plan_track TEXT NOT NULL,
  history_year INTEGER NOT NULL,
  -- The published table's own track name, which is the plan track only from 2025 on.
  history_track TEXT NOT NULL,
  scope TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('VERIFIED','NOT_ESTABLISHED','QUARANTINED')),
  basis TEXT NOT NULL,
  examined TEXT NOT NULL,
  not_examined TEXT,
  reviewer TEXT, review_date TEXT,
  evidence_ids TEXT,
  UNIQUE (plan_year, plan_track, history_year, history_track)
);

CREATE VIEW v_comparability AS
SELECT link_id, plan_year, plan_track, history_year, history_track, scope, status,
       basis, examined, not_examined, reviewer, review_date, evidence_ids
FROM comparability_link ORDER BY plan_year, plan_track, history_year DESC;

CREATE TABLE score_distribution (
  distribution_pk INTEGER PRIMARY KEY,  distribution_id TEXT NOT NULL UNIQUE,
  year INTEGER NOT NULL, province TEXT NOT NULL, track TEXT NOT NULL,
  -- Which definition of "track" the published table uses: new_gaokao (2025 起 物理类/历史类)
  -- or old_system (2024 及以前 理科/文科). The two are different definitions, recorded so a
  -- reader can never mistake a 理科 row for a 物理类 row.
  curriculum_system TEXT,
  score_basis TEXT, score_basis_status TEXT NOT NULL,
  source_id TEXT, source_url TEXT, publisher TEXT,
  register_path TEXT, register_run_id TEXT, retrieved_at TEXT,
  verification_status TEXT NOT NULL, verification_basis TEXT,
  extraction_method TEXT,
  score_min INTEGER, score_max INTEGER, row_count INTEGER,
  cumulative_at_lowest INTEGER, head_group_above_max INTEGER,
  coverage_note TEXT,
  UNIQUE (year, province, track)
);

-- One row per published score. A score the official table omits is NOT stored: the table
-- leaves it out because nobody attained it, so absence means unknown, never zero. Ranks are
-- derived, not authoritative: [rank_best, rank_worst] is the interval the published counts
-- support, per the project matching spec.
CREATE TABLE score_distribution_row (
  row_pk INTEGER PRIMARY KEY,
  distribution_pk INTEGER NOT NULL REFERENCES score_distribution(distribution_pk),
  score INTEGER NOT NULL,
  count INTEGER,
  cumulative INTEGER NOT NULL,
  rank_best INTEGER,
  rank_worst INTEGER,
  count_derived INTEGER NOT NULL,
  count_derivation TEXT,
  evidence_image TEXT NOT NULL,
  image_sha256 TEXT NOT NULL,
  score_x INTEGER, score_y INTEGER,
  count_x INTEGER, count_y INTEGER,
  cumulative_x INTEGER, cumulative_y INTEGER,
  UNIQUE (distribution_pk, score)
);

CREATE INDEX idx_distribution_row_lookup ON score_distribution_row (distribution_pk, score);
CREATE INDEX idx_distribution_row_rank ON score_distribution_row (distribution_pk, rank_worst);

CREATE TABLE data_issue (
  issue_pk INTEGER PRIMARY KEY,
  source_pk INTEGER NOT NULL REFERENCES source_document(source_pk),
  source_row INTEGER NOT NULL, field_name TEXT, issue_code TEXT NOT NULL,
  raw_value TEXT, detail TEXT
);

CREATE INDEX idx_group_institution ON admission_group (institution_pk, plan_year);
CREATE INDEX idx_group_batch ON admission_group (batch, admission_type, track);
CREATE INDEX idx_offering_group ON offering (group_pk);
CREATE INDEX idx_offering_major ON offering (major_code);
CREATE INDEX idx_offering_category ON offering (category, category_class);
CREATE INDEX idx_offering_level ON offering (level_label, degree_level);
CREATE INDEX idx_plan_count ON plan_record (plan_count);
CREATE INDEX idx_plan_tuition ON plan_record (tuition_amount);
CREATE INDEX idx_offering_tag ON offering_tag (tag_kind, tag);
CREATE INDEX idx_institution_tag ON institution_tag (tag_kind, tag);
CREATE INDEX idx_institution_province ON institution (province, city);
CREATE INDEX idx_requirement_group ON requirement (group_pk);
CREATE INDEX idx_issue_code ON data_issue (issue_code);

-- Readable views. Queries and evidence work can use these instead of the surrogate keys.
CREATE VIEW v_source_document AS SELECT * FROM source_document;

CREATE VIEW v_observation AS
SELECT
  'OBS-' || ob.source_year || '-' || ob.metric_type || '-' ||
    COALESCE(g.group_id, o.offering_id) AS observation_id,
  ob.observation_pk, ob.subject_type,
  COALESCE(g.group_id, og.group_id) AS group_id,
  o.offering_id, COALESCE(g.group_id, o.offering_id) AS subject_id,
  ob.source_year, ob.metric_type, ob.score, ob.rank, ob.rank_is_valid, ob.admitted_count,
  ob.observed_track, ob.observed_batch, ob.observed_admission_type, ob.score_basis,
  ob.comparability,
  hm.score_column_letter || ob.source_row AS evidence_score_cell,
  hm.rank_column_letter || ob.source_row AS evidence_rank_cell,
  hm.score_column AS evidence_score_header,
  hm.rank_column AS evidence_rank_header,
  sd.source_id, ob.source_row
FROM admission_observation ob
LEFT JOIN admission_group g ON g.group_pk = ob.group_pk
LEFT JOIN offering o ON o.offering_pk = ob.offering_pk
LEFT JOIN admission_group og ON og.group_pk = o.group_pk
JOIN source_document sd ON sd.source_pk = ob.source_pk
JOIN history_column_map hm ON hm.source_year = ob.source_year AND hm.metric_type = ob.metric_type;

-- Historical observations joined back to the plan row they were exported from.
-- observed_* columns stay NULL: the earlier year's batch, track and admission type
-- are unknown, so the plan row's values are exposed only as an explicitly assumed
-- join key (batch_assumed_from_plan_row = 1).
CREATE VIEW v_observation_context AS
SELECT
  ob.observation_id, ob.subject_type, ob.subject_id, ob.source_year, ob.metric_type,
  ob.score, ob.rank, ob.rank_is_valid, ob.admitted_count, ob.comparability,
  g.group_id AS assumed_group_id, i.institution_id AS assumed_institution_id,
  g.track AS assumed_track, g.batch AS assumed_batch,
  g.admission_type AS assumed_admission_type, 1 AS batch_assumed_from_plan_row
FROM v_observation ob
LEFT JOIN admission_group g ON g.group_id = ob.group_id
LEFT JOIN institution i ON i.institution_pk = g.institution_pk;

CREATE VIEW v_offering_full AS
SELECT
  o.offering_id, o.major_code, o.major_name, o.major_note, o.category, o.category_class,
  o.degree_level, o.level_label, o.is_new,
  p.plan_count, p.tuition_amount, p.tuition_raw, p.tuition_note, p.study_years,
  p.tuition_currency, p.tuition_period, p.tuition_comparable,
  r.rule_kind AS requirement_rule_kind, r.subjects AS requirement_subjects,
  r.raw_text AS requirement_raw, r.parse_status AS requirement_parse_status,
  g.group_id, g.group_code, g.batch, g.admission_type, g.admission_type_raw,
  g.admission_type_inferred, g.track, g.plan_year,
  i.institution_id, i.institution_code, i.canonical_name, i.province, i.city,
  i.city_tier, i.ownership, i.institution_type, i.institution_ranking,
  i.academic_grade, i.academic_ranking, i.postgraduate_rate,
  i.institution_level, i.admission_rule, i.charter_url,
  sd.source_id, p.source_row
FROM offering o
JOIN admission_group g ON g.group_pk = o.group_pk
JOIN institution i ON i.institution_pk = g.institution_pk
JOIN plan_record p ON p.offering_pk = o.offering_pk
LEFT JOIN requirement r ON r.requirement_pk = p.requirement_pk
JOIN source_document sd ON sd.source_pk = p.source_pk;

-- One row per offering with the earlier-year minimum rank and score pulled up for the
-- three reference years. These are the boundaries the comparison rules use; mean and
-- maximum stay in admission_observation for information only.
CREATE VIEW v_offering_history AS
SELECT
  o.offering_id,
  MAX(CASE WHEN ob.source_year = 2025 AND ob.metric_type = 'major_admission_min' THEN ob.rank END) AS major_rank_2025,
  MAX(CASE WHEN ob.source_year = 2025 AND ob.metric_type = 'major_admission_min' THEN ob.score END) AS major_score_2025,
  MAX(CASE WHEN ob.source_year = 2024 AND ob.metric_type = 'major_admission_min' THEN ob.rank END) AS major_rank_2024,
  MAX(CASE WHEN ob.source_year = 2024 AND ob.metric_type = 'major_admission_min' THEN ob.score END) AS major_score_2024,
  MAX(CASE WHEN ob.source_year = 2023 AND ob.metric_type = 'major_admission_min' THEN ob.rank END) AS major_rank_2023,
  MAX(CASE WHEN ob.source_year = 2023 AND ob.metric_type = 'major_admission_min' THEN ob.score END) AS major_score_2023,
  MAX(CASE WHEN ob.comparability = 'SOURCE_CONFLICT' THEN 1 ELSE 0 END) AS history_source_conflict,
  COUNT(ob.observation_pk) AS history_observation_count
FROM offering o
LEFT JOIN admission_observation ob ON ob.offering_pk = o.offering_pk
GROUP BY o.offering_id;

CREATE VIEW v_group_history AS
SELECT
  g.group_id,
  MAX(CASE WHEN ob.source_year = 2025 THEN ob.rank END) AS group_rank_2025,
  MAX(CASE WHEN ob.source_year = 2025 THEN ob.score END) AS group_score_2025,
  MAX(CASE WHEN ob.comparability = 'SOURCE_CONFLICT' THEN 1 ELSE 0 END) AS group_history_source_conflict
FROM admission_group g
LEFT JOIN admission_observation ob ON ob.group_pk = g.group_pk
GROUP BY g.group_id;

-- Query-facing pool: everything needed to filter and rank one offering in a single scan.
-- Materialized as a table because the matching entry point reads the whole track at once;
-- as a view it re-ran every join on each query. Rebuilt with the rest of the database.
CREATE TABLE match_pool (
  offering_pk INTEGER PRIMARY KEY,
  offering_id TEXT NOT NULL UNIQUE,
  institution_id TEXT NOT NULL, institution_code TEXT NOT NULL, canonical_name TEXT NOT NULL,
  province TEXT, city TEXT, city_tier TEXT, ownership TEXT, institution_type TEXT,
  institution_ranking INTEGER, academic_grade TEXT, academic_ranking INTEGER,
  postgraduate_rate REAL, institution_level TEXT,
  group_id TEXT NOT NULL, group_code TEXT NOT NULL, batch TEXT NOT NULL,
  admission_type TEXT NOT NULL, admission_type_inferred INTEGER NOT NULL, track TEXT NOT NULL,
  major_code TEXT NOT NULL, major_name TEXT NOT NULL, major_note TEXT,
  category TEXT, category_class TEXT, degree_level TEXT, level_label TEXT,
  is_new INTEGER NOT NULL, plan_count INTEGER,
  tuition_amount REAL, tuition_raw TEXT, tuition_note TEXT,
  tuition_currency TEXT, tuition_period TEXT, tuition_comparable INTEGER NOT NULL,
  requirement_rule_kind TEXT NOT NULL, requirement_subjects TEXT NOT NULL,
  requirement_raw TEXT, requirement_parse_status TEXT NOT NULL,
  source_id TEXT NOT NULL, source_row INTEGER NOT NULL,
  major_rank_2025 INTEGER, major_score_2025 REAL,
  major_rank_2024 INTEGER, major_score_2024 REAL,
  major_rank_2023 INTEGER, major_score_2023 REAL,
  group_rank_2025 INTEGER, group_score_2025 REAL,
  history_source_conflict INTEGER NOT NULL
);

CREATE INDEX idx_pool_track ON match_pool (track, batch);
CREATE INDEX idx_pool_category ON match_pool (track, category);
CREATE INDEX idx_pool_level ON match_pool (track, level_label);
CREATE INDEX idx_pool_tuition ON match_pool (track, tuition_amount);
CREATE INDEX idx_pool_plan ON match_pool (track, plan_count);
CREATE INDEX idx_pool_inst ON match_pool (institution_code);
CREATE INDEX idx_pool_history ON match_pool (track, major_rank_2025);
"""

# Populated after every fact table is loaded; the pool is a denormalized snapshot.
MATCH_POOL_SQL = """
INSERT INTO match_pool
SELECT
  o.offering_pk, f.offering_id, f.institution_id, f.institution_code, f.canonical_name,
  f.province, f.city, f.city_tier, f.ownership, f.institution_type, f.institution_ranking,
  f.academic_grade, f.academic_ranking, f.postgraduate_rate, f.institution_level,
  f.group_id, f.group_code, f.batch, f.admission_type, f.admission_type_inferred, f.track,
  f.major_code, f.major_name, f.major_note, f.category, f.category_class, f.degree_level,
  f.level_label, f.is_new, f.plan_count, f.tuition_amount, f.tuition_raw, f.tuition_note,
  f.tuition_currency, f.tuition_period, f.tuition_comparable,
  COALESCE(f.requirement_rule_kind, 'unknown'), COALESCE(f.requirement_subjects, ''),
  f.requirement_raw, COALESCE(f.requirement_parse_status, 'MISSING'),
  f.source_id, f.source_row,
  h.major_rank_2025, h.major_score_2025, h.major_rank_2024, h.major_score_2024,
  h.major_rank_2023, h.major_score_2023, g2.group_rank_2025, g2.group_score_2025,
  COALESCE(h.history_source_conflict, 0)
FROM offering o
JOIN v_offering_full f ON f.offering_id = o.offering_id
LEFT JOIN v_offering_history h ON h.offering_id = f.offering_id
LEFT JOIN v_group_history g2 ON g2.group_id = f.group_id;
"""

# Facets for building a query form without scanning fact tables.
FACET_VIEW_SQL = """
CREATE VIEW v_facet_summary AS
SELECT 'batch' AS facet, batch AS value, track, COUNT(*) AS offerings FROM match_pool GROUP BY batch, track
UNION ALL
SELECT 'category', category, track, COUNT(*) FROM match_pool GROUP BY category, track
UNION ALL
SELECT 'level_label', level_label, track, COUNT(*) FROM match_pool GROUP BY level_label, track
UNION ALL
SELECT 'admission_type', admission_type, track, COUNT(*) FROM match_pool GROUP BY admission_type, track
UNION ALL
SELECT 'institution_province', province, track, COUNT(*) FROM match_pool GROUP BY province, track
UNION ALL
SELECT 'requirement_rule', requirement_rule_kind, track, COUNT(*) FROM match_pool GROUP BY requirement_rule_kind, track;
"""

SCORE_DISTRIBUTION_VIEW_SQL = """
CREATE VIEW v_score_distribution_row AS
SELECT
  d.distribution_id, d.year, d.province, d.track, d.curriculum_system,
  d.score_basis, d.score_basis_status,
  d.verification_status, d.source_id, d.source_url,
  r.score, r.count, r.cumulative, r.rank_best, r.rank_worst,
  r.count_derived, r.count_derivation,
  r.evidence_image, r.image_sha256,
  r.score_x, r.score_y, r.count_x, r.count_y, r.cumulative_x, r.cumulative_y,
  r.row_pk
FROM score_distribution_row r
JOIN score_distribution d ON d.distribution_pk = r.distribution_pk;
"""


def establish_comparability(connection: sqlite3.Connection, stats: dict) -> dict:
    """Record which cross-year comparisons are established, with their basis and reviewer.

    The matching spec requires an explicit ``comparability_link`` before two years may be compared,
    and says outright that an algorithm's suggestion does not satisfy human review. So every row
    written here names who established it and what was actually examined; anything not examined is
    listed in ``not_examined`` instead of being left for a reader to assume.

    The links written are the ones the data supports:

    * **2025 ↔ 2026, same track name**: both years are the 3+1+2 system, so 物理类 means the same
      thing in both, and both years have an official table in the release. The check performed is
      the rank cross-check (every workbook rank falls inside the official interval for its score),
      which is recorded as the evidence.
    * **2024/2023, 理科/文科**: a different curriculum system, and the exam's track definition for
      those years is not stated row by row in the source. Written as NOT_ESTABLISHED so a reader
      sees the gap rather than inferring comparability from the year alone.

    Nothing is inferred from code similarity, and no link is created for years without a published
    table: a missing table means the comparison cannot even be attempted.
    """
    available = {(year, track): system for year, track, system in
                 connection.execute("SELECT year, track, curriculum_system FROM score_distribution")}
    rows = []
    for plan_track, history in HISTORICAL_TRACKS.items():
        for history_year in sorted(history, reverse=True):
            history_track = history[history_year]
            system = available.get((history_year, history_track))
            key = available.get((PLAN_YEAR, plan_track))
            if system is None:
                continue  # no published table for that year: nothing to compare against
            same_system = system == key
            if same_system:
                link_id = f"CMP-{PLAN_YEAR}-{plan_track}-{history_year}-{history_track}"
                rows.append((
                    link_id, PLAN_YEAR, plan_track, history_year, history_track, "same_track_name",
                    "VERIFIED", COMPARABILITY_BASIS_SAME_SYSTEM,
                    COMPARABILITY_EXAMINED,
                    COMPARABILITY_NOT_EXAMINED,
                    COMPARABILITY_REVIEWER, COMPARABILITY_REVIEW_DATE,
                    COMPARABILITY_EVIDENCE))
            else:
                link_id = f"CMP-{PLAN_YEAR}-{plan_track}-{history_year}-{history_track}"
                rows.append((
                    link_id, PLAN_YEAR, plan_track, history_year, history_track, "different_system",
                    "NOT_ESTABLISHED", COMPARABILITY_BASIS_DIFFERENT_SYSTEM,
                    "已确认该年为文理分科口径，与本计划年的物理类/历史类不是同一定义",
                    "逐年科类定义、专业组重组与计划口径均未核对",
                    None, None, None))
    connection.executemany(
        "INSERT INTO comparability_link (link_id, plan_year, plan_track, history_year, "
        "history_track, scope, status, basis, examined, not_examined, reviewer, review_date, "
        "evidence_ids) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", rows)
    _COMPARABILITY_STATUS.clear()
    for row in rows:
        _COMPARABILITY_STATUS[(row[3], row[4])] = row[6]
    stats["comparability_links"] = len(rows)
    stats["comparability_verified"] = sum(1 for row in rows if row[6] == "VERIFIED")
    return {"links": len(rows), "verified": stats["comparability_verified"]}


def load_score_distribution(connection: sqlite3.Connection, source_path: Path | None,
                            stats: dict) -> dict:
    """Load the published score-distribution tables (一分一段表) into the database.

    Every registered year is loaded: 2025 起 物理类/历史类 and 2024 及以前 理科/文科. Each
    table is stored as published — one row per printed score. Scores the official table omits
    are not invented, because an omitted score means nobody attained it, not zero. Rank bounds
    follow the project spec: for an exact printed row, rank_best = cumulative - count + 1 and
    rank_worst = cumulative.

    ``curriculum_system`` records which definition of "track" the table uses, taken from the
    publication itself. It is not a comparability judgement: a 2024 理科 row is never read as
    if it were a 2024 物理类 row, and the 2025 物理类 table is the only one whose track names
    match the workbook's current sheets.

    Verification status is VERIFIED: the source is the exam institute's own publication, every
    row is traceable to a registered image and OCR box, the published arithmetic closes, and the
    extraction's own readings were cross-checked against a second and third OCR scale plus the
    published arithmetic (see resolve_columns in extract_score_distribution.py). The scoring
    basis is not printed on the tables, so it is recorded as convention rather than fact.
    """
    if source_path is None or not source_path.exists():
        stats["score_distribution_loaded"] = False
        stats["score_distribution_note"] = "not loaded; score-to-rank conversion unavailable"
        return {"loaded": False}
    payload = json.loads(source_path.read_text(encoding="utf-8"))
    # Image hashes come from the fetch registers, so each row's evidence can be re-checked
    # against the exact bytes that were published.
    image_hashes: dict[str, str] = {}
    register_root = json.loads(SCORE_DISTRIBUTION_REGISTER.read_text(encoding="utf-8"))
    for run in register_root.get("runs", {}).values():
        register = json.loads((APP / run["register_path"]).read_text(encoding="utf-8"))
        image_hashes.update({entry["filename"]: entry["sha256"] for entry in register["entries"]
                             if entry.get("asset_kind") == "score_distribution_image"})
    """Backwards compatibility: version 1 payloads held ``tracks`` for a single year."""
    distributions = payload.get("distributions")
    if distributions is None:
        distributions = [{"track": track, "year": payload["year"], **data}
                         for track, data in payload.get("tracks", {}).items()]
    loaded = {}
    for data in distributions:
        rows = data["rows"]
        if not rows:
            continue
        scores = [row["score"] for row in rows]
        top = rows[0]
        head_group = None
        if top["count"] is not None and top["cumulative"] is not None:
            head_group = top["cumulative"] - top["count"]
        distribution_id = data.get("distribution_id") or             f"SCORE-DIST-{payload['province']}-{data['year']}-{data['track']}"
        cursor = connection.execute(
            "INSERT INTO score_distribution (distribution_id, year, province, track, "
            "curriculum_system, score_basis, score_basis_status, source_id, source_url, publisher, "
            "register_path, register_run_id, retrieved_at, verification_status, verification_basis, "
            "extraction_method, score_min, score_max, row_count, cumulative_at_lowest, "
            "head_group_above_max, coverage_note) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (distribution_id, data["year"], data.get("province", payload["province"]),
             data["track"], data.get("curriculum_system"), SCORE_DISTRIBUTION_BASIS,
             SCORE_DISTRIBUTION_BASIS_STATUS, data["source_id"], data["publication_url"],
             "四川省教育考试院", data.get("register_path"), data.get("run_id"),
             data.get("retrieved_at"), "VERIFIED",
             "官方发布页逐行抽取；count/cumulative 算术闭合；多尺度 OCR 交叉核对；逐行可回溯到登记图片与坐标",
             payload["extraction_method"], min(scores), max(scores), len(rows),
             rows[-1]["cumulative"], head_group,
             "最低公布分数以下的考生未纳入；最后累计数不等于全体考生总数"))
        distribution_pk = cursor.lastrowid
        row_values = []
        for row in rows:
            count = row["count"]
            cumulative = row["cumulative"]
            rank_best = cumulative - count + 1 if count is not None else None
            evidence = row["evidence"]
            score_box = evidence.get("score_box") or {}
            count_box = evidence.get("count_box") or {}
            cumulative_box = evidence.get("cumulative_box") or {}
            row_values.append((
                distribution_pk, row["score"], count, cumulative, rank_best, cumulative,
                1 if row.get("count_derived") else 0, row.get("count_derivation"),
                evidence["image"], image_hashes.get(evidence["image"]),
                score_box.get("x"), score_box.get("y"),
                count_box.get("x"), count_box.get("y"),
                cumulative_box.get("x"), cumulative_box.get("y")))
        connection.executemany(
            "INSERT INTO score_distribution_row (distribution_pk, score, count, cumulative, "
            "rank_best, rank_worst, count_derived, count_derivation, evidence_image, image_sha256, "
            "score_x, score_y, count_x, count_y, cumulative_x, cumulative_y) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", row_values)
        loaded[distribution_id] = {
            "distribution_id": distribution_id, "year": data["year"], "track": data["track"],
            "curriculum_system": data.get("curriculum_system"), "rows": len(rows),
            "score_min": min(scores), "score_max": max(scores),
            "counts_derived": data.get("counts_derived", 0),
            "cumulative_at_lowest": rows[-1]["cumulative"],
            "head_group_above_max": head_group}
    stats["score_distribution_loaded"] = True
    stats["score_distribution_rows"] = sum(item["rows"] for item in loaded.values())
    stats["score_distribution_tables"] = loaded
    stats["score_distribution_years"] = sorted({item["year"] for item in loaded.values()})
    return {"loaded": True, "tables": loaded}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def short_hash(*parts: str) -> str:
    return hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()[:6]


def parse_requirement(raw: str | None) -> tuple[str, list[str], str]:
    """Return (rule_kind, subject_codes, parse_status).

    rule_kind is unlimited | all_of | unknown. 'unknown' is never merged into pass or
    fail; the caller keeps eligibility UNKNOWN. An unlimited rule passes for any
    complete selection and stays distinct from an empty any_of, which would fail.
    """
    if raw is None:
        return "unknown", [], "MISSING"
    cleaned = raw.replace(" ", "").replace("、", "和").replace("，", "和").replace(",", "和")
    if cleaned in {"不限", "无", "不限选科"}:
        return "unlimited", [], "PARSED"
    codes: list[str] = []
    for part in (item for item in cleaned.split("和") if item):
        code = SUBJECT_CODES.get(part)
        if code is None:
            return "unknown", [], f"UNRECOGNIZED:{raw}"
        codes.append(code)
    if not codes:
        return "unknown", [], f"UNRECOGNIZED:{raw}"
    return "all_of", sorted(set(codes)), "PARSED"


def parse_tuition(cell, issues: list, source_id: str, row: int):
    """Return (amount, raw_text, note). Currency and billing period stay unknown."""
    raw = text(cell)
    if raw is None:
        return None, None, None
    value = number(cell)
    if value is not None:
        return float(value), raw, None
    if raw == "免费":
        issues.append((source_id, row, COLUMNS["tuition"], "TUITION_MARKED_FREE", raw,
                       "amount stored as 0; currency and billing period unverified"))
        return 0.0, raw, "免费"
    if raw == "待定":
        issues.append((source_id, row, COLUMNS["tuition"], "TUITION_PENDING", raw,
                       "amount unknown; not treated as zero"))
        return None, raw, "待定"
    issues.append((source_id, row, COLUMNS["tuition"], "TUITION_UNRESOLVED", raw,
                   "amount unknown; raw text preserved"))
    return None, raw, raw


def parse_discipline_eval(raw: str | None) -> tuple[str | None, str | None]:
    if raw is None:
        return None, None
    round4 = round5 = None
    for part in re.split(r"[；;]", raw):
        part = part.strip()
        if part.startswith("四轮："):
            round4 = part[3:] or None
        elif part.startswith("五轮："):
            round5 = part[3:] or None
    return round4, round5


def clean_row(track: str, fields: dict, source_id: str, row: int, issues: list) -> dict:
    """Turn one raw worksheet row into plan facts. Nothing is inferred silently."""
    def value(field):
        return text(fields.get(COLUMNS[field]))

    def ident(field):
        return identifier(fields.get(COLUMNS[field]))

    def num(field, integer=False):
        return number(fields.get(COLUMNS[field]), integer)

    plan_count = num("plan_count", True)
    if value("plan_count") is not None and plan_count is None:
        issues.append((source_id, row, COLUMNS["plan_count"], "NON_NUMERIC_NUMBER",
                       value("plan_count"), "plan count unknown"))
    elif plan_count is not None and plan_count < 0:
        issues.append((source_id, row, COLUMNS["plan_count"], "NEGATIVE_PLAN_COUNT",
                       value("plan_count"), "rejected"))
        plan_count = None

    declared = value("track_declared")
    if declared is None:
        issues.append((source_id, row, COLUMNS["track_declared"], "TRACK_FROM_EXPLICIT_SHEET_MAPPING",
                       None, f"sheet mapping -> {track}"))
    elif TRACK_LABELS.get(declared, declared) != track:
        issues.append((source_id, row, COLUMNS["track_declared"], "TRACK_CONFLICT",
                       declared, f"declared track differs from sheet mapping -> {track}"))

    admission_type_raw = value("admission_type")
    if admission_type_raw is None:
        issues.append((source_id, row, COLUMNS["admission_type"],
                       "ADMISSION_TYPE_BLANK_TREATED_AS_ORDINARY", None,
                       "计划类别 blank -> 普通类 (inferred, flagged)"))

    requirement_raw = value("subject_requirement")
    rule_kind, subjects, parse_status = parse_requirement(requirement_raw)
    if rule_kind == "unknown":
        issues.append((source_id, row, COLUMNS["subject_requirement"], "REQUIREMENT_UNRESOLVED",
                       requirement_raw, parse_status))

    tuition_amount, tuition_raw, tuition_note = parse_tuition(
        fields.get(COLUMNS["tuition"]), issues, source_id, row)
    if tuition_raw is not None:
        issues.append((source_id, row, COLUMNS["tuition"], "TUITION_CURRENCY_PERIOD_UNKNOWN",
                       tuition_raw, "tuition_comparable=0; currency and billing period unverified"))

    is_new_raw = value("is_new")
    is_new = 1 if is_new_raw == "新增" else 0
    if is_new_raw is not None and not is_new:
        issues.append((source_id, row, COLUMNS["is_new"], "IS_NEW_UNRECOGNIZED", is_new_raw,
                       "treated as not-new"))

    for field in ("plan_count", "group_plan_count", "group_major_count", "study_years", "tuition"):
        cell = fields.get(COLUMNS[field])
        if cell and cell.get("formula") is not None:
            issues.append((source_id, row, COLUMNS[field], "FORMULA_NOT_EVALUATED", None,
                           "formula cell; cached value is evidence only and is not used as a value"))
        if cell and cell.get("cell_type") == "e":
            issues.append((source_id, row, COLUMNS[field], "EXCEL_ERROR_VALUE", None,
                           "error value treated as unknown"))

    round4, round5 = parse_discipline_eval(value("discipline_eval"))
    return {
        "batch": value("batch") or "UNKNOWN",
        "admission_type": admission_type_raw or "普通类",
        "admission_type_raw": admission_type_raw,
        "admission_type_inferred": 0 if admission_type_raw is not None else 1,
        "institution_code": ident("institution_code"),
        "institution_name": value("institution_name"),
        "province": value("province"), "city": value("city"),
        "institution_labels": value("institution_labels"),
        "ownership": value("ownership"),
        "group_compound_code": ident("group_compound_code"),
        "group_code": ident("group_code"),
        "major_code": ident("major_code"), "major_name": value("major_name"),
        "major_note": value("major_note"), "other_note": value("other_note"),
        "subject_requirement": requirement_raw, "rule_kind": rule_kind,
        "requirement_subjects": subjects, "requirement_parse_status": parse_status,
        "degree_level": value("degree_level"), "level_label": value("level_label"),
        "category": value("category"), "category_class": value("category_class"),
        "is_new": is_new, "plan_count": plan_count,
        "group_plan_count": num("group_plan_count", True),
        "group_major_count": num("group_major_count", True),
        "tuition_amount": tuition_amount, "tuition_raw": tuition_raw, "tuition_note": tuition_note,
        "study_years": num("study_years"),
        "group_majors_raw": value("group_majors"),
        "city_tier": value("city_tier"), "institution_level": value("institution_level"),
        "rename_history": value("rename_history"), "affiliation": value("affiliation"),
        "institution_type": value("institution_type"),
        "postgraduate_rate": num("postgraduate_rate"),
        "institution_ranking": num("institution_ranking", True),
        "master_program_count": num("master_program_count", True),
        "master_programs": value("master_programs"),
        "doctor_program_count": num("doctor_program_count", True),
        "doctor_programs": value("doctor_programs"),
        "admission_rule": value("admission_rule"), "charter_url": value("charter_url"),
        "academic_grade": value("academic_grade"),
        "academic_ranking": num("academic_ranking", True),
        "discipline_eval_round4": round4, "discipline_eval_round5": round5,
        "major_level": value("major_level"),
        "major_master_programs": value("major_master_programs"),
        "major_doctor_programs": value("major_doctor_programs"),
        "_evidence": {field: (fields.get(column) or {}).get("cell")
                      for field, column in COLUMNS.items()},
    }


def history_observations(fields: dict, source_id: str, row: int, issues: list,
                         plan_track: str) -> list[dict]:
    """Build earlier-year facts. track/batch/admission type stay unknown.

    ``comparability`` records whether this year may be compared with the plan year. It is read
    from the published link for (plan year, plan track, history year) rather than assumed: 2025 is
    established (same 3+1+2 system, verified against the official table) and is written
    ``COMPARABLE``, while 2024/2023 are written ``NOT_ESTABLISHED`` because they are the 文理分科
    tables. A year with no link at all stays NOT_ESTABLISHED rather than defaulting to comparable.
    """
    links = {(history_year, table_track): status for
             (history_year, table_track), status in _COMPARABILITY_STATUS.items()
             if table_track == HISTORICAL_TRACKS.get(plan_track, {}).get(history_year)}
    records = []
    for year in HISTORY_YEARS:
        for subject_type, metric_type, score_column, rank_column, count_column in HISTORY_METRICS[year]:
            score_cell = fields.get(score_column)
            rank_cell = fields.get(rank_column)
            score = number(score_cell)
            rank_value = number(rank_cell, integer=True)
            rank_is_valid = 1
            rank = rank_value
            if rank_value == 0:
                rank = None
                rank_is_valid = 0
                issues.append((source_id, row, rank_column, "ZERO_RANK_INVALID", "0",
                               "rank 0 is not a real rank; stored as unknown with rank_is_valid=0"))
            if score is None and rank is None and rank_is_valid:
                continue
            for cell, column in ((score_cell, score_column), (rank_cell, rank_column),
                                 (fields.get(count_column) if count_column else None, count_column)):
                if cell and cell.get("formula") is not None:
                    issues.append((source_id, row, column, "FORMULA_NOT_EVALUATED", None,
                                   "formula cell in history column"))
                if cell and cell.get("cell_type") == "e":
                    issues.append((source_id, row, column, "EXCEL_ERROR_VALUE", None,
                                   "error value in history column"))
            records.append({
                "subject_type": subject_type,
                "source_year": year, "metric_type": metric_type,
                "score": score, "rank": rank, "rank_is_valid": rank_is_valid,
                "admitted_count": number(fields.get(count_column), integer=True) if count_column else None,
                "observed_track": None, "observed_batch": None, "observed_admission_type": None,
                "score_basis": None,
                # The link's status decides: VERIFIED links become COMPARABLE, everything else
                # keeps NOT_ESTABLISHED so the absence of a decision is visible downstream.
                "comparability": ("COMPARABLE"
                                  if links.get((year, HISTORICAL_TRACKS[plan_track][year]))
                                  == "VERIFIED" else "NOT_ESTABLISHED"),
                "source_id": source_id, "source_row": row,
            })
    return records


def read_workbook(path: Path, sheet: str):
    """Yield ('header', ...) once, then ('row', (row_number, fields)) per data row."""
    book = Workbook(path)
    try:
        layout = next(item for item in (book.layout(name) for name in book.sheets) if item["name"] == sheet)
        merged_starts = {item.split(":")[0] for item in layout["merged_ranges"]}
        anchors: dict = {}
        headers: dict = {}
        indexed_merges: dict = {}
        for row_number, cells in book.rows(sheet):
            for cell in cells.values():
                if cell["cell"] in merged_starts:
                    anchors[cell["cell"]] = cell
            if not headers:
                candidate = {text(cell): column for column, cell in cells.items() if text(cell)}
                if "院校代码" in candidate and "专业名称" in candidate:
                    headers = candidate
                    indexed_merges = merge_index(layout["merged_ranges"], headers.values())
                    yield "header", (row_number, headers, layout)
                continue
            if not any(cell["value"] is not None or cell["formula"] is not None for cell in cells.values()):
                continue
            fields = {heading: resolve_cell(column, row_number, cells, indexed_merges, anchors)
                      for heading, column in headers.items()}
            yield "row", (row_number, fields)
    finally:
        book.close()


def collapse_repeated_issues(connection: sqlite3.Connection) -> int:
    """Replace per-row copies of identical source-wide notes with one counted row."""
    collapsed = 0
    for code in sorted(AGGREGATED_ISSUES):
        rows = connection.execute(
            "SELECT source_pk, field_name, COUNT(*), MIN(source_row) FROM data_issue "
            "WHERE issue_code = ? GROUP BY source_pk, field_name", (code,)).fetchall()
        for source_pk, field_name, count, first_row in rows:
            if count < 2:
                continue
            connection.execute(
                "DELETE FROM data_issue WHERE issue_code = ? AND source_pk = ? AND field_name IS ?",
                (code, source_pk, field_name))
            connection.execute(
                "INSERT INTO data_issue (source_pk, source_row, field_name, issue_code, raw_value, detail) "
                "VALUES (?,?,?,?,?,?)",
                (source_pk, first_row, field_name, code, None,
                 f"applies to {count} rows of this source; first at row {first_row}"))
            collapsed += count - 1
    return collapsed


def build(workbook_root: Path, output: Path, manifest_path: Path | None = None,
          score_distribution_path: Path | None = None) -> dict:
    resolved = [(track, sheet, name, workbook_root / name) for track, sheet, name in INPUTS]
    for _track, _sheet, _name, path in resolved:
        if not path.exists():
            raise SystemExit(f"Missing source workbook: {path}")
    digests = {name: sha256_file(path) for _track, _sheet, name, path in resolved}
    combined = hashlib.sha256("|".join(sorted(digests.values())).encode("ascii")).hexdigest()
    release_id = f"LOCAL-OFFLINE-{PLAN_YEAR}-{combined[:12]}"

    if output.exists():
        output.unlink()
    output.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(output)
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(SCHEMA)

    stats = {"sources": 0, "institutions": 0, "groups": 0, "offerings": 0, "requirements": 0,
             "plan_records": 0, "observations": 0, "issues": 0, "rows": 0,
             "tuition_unresolved": 0, "requirement_unresolved": 0, "plan_count_sum": 0,
             "group_requirement_varies": 0, "duplicate_offering_keys": 0,
             "repeated_group_observations": 0, "source_conflicts": 0}

    connection.execute(
        "INSERT INTO release VALUES (?,?,?,?,?,?,?)",
        (release_id, SCHEMA_VERSION, RULES_VERSION, PLAN_YEAR, "NOT_PUBLISHED", 0,
         "Offline working database for local matching. Not a data release; no human verification performed."))
    for key, value in (("release_id", release_id), ("plan_year", str(PLAN_YEAR)),
                       ("province", PROVINCE), ("schema_version", SCHEMA_VERSION),
                       ("rules_version", RULES_VERSION),
                       ("builder", "pipelines/task03/build_admissions_db.py"),
                       ("publication_status", "NOT_PUBLISHED"),
                       ("source_combined_sha256", combined),
                       ("historical_fact_policy",
                        "observed_track/observed_batch/observed_admission_type stay NULL; "
                        "the plan row's values are never written back onto earlier years"),
                       ("observation_identity",
                        "subject identity is (subject_type, group_pk|offering_pk); readable ids via v_observation")):
        connection.execute("INSERT INTO meta VALUES (?,?)", (key, value))
    for key, value in sorted(digests.items()):
        connection.execute("INSERT INTO meta VALUES (?,?)", (f"source_sha256:{key}", value))

    institutions: dict[str, int] = {}
    groups: dict[str, int] = {}
    offer_pks: dict[str, int] = {}
    tags_seen: set[tuple] = set()
    offering_tags_seen: set[tuple] = set()
    offer_key_seen: set[tuple] = set()
    requirements: dict[tuple, int] = {}
    requirement_offering: list[tuple[str, str, int]] = []
    observations: dict[tuple, list] = {}
    issues: list[tuple] = []
    requirement_seq = 0
    header_letters: dict[str, str] = {}

    # The score distributions load first: establishing which cross-year comparisons are allowed
    # needs to know which years have a published table and which curriculum system each uses, and
    # the history rows read that decision while they are cleaned.
    distribution_stats = load_score_distribution(connection, score_distribution_path, stats)
    stats["score_distribution"] = distribution_stats
    stats["comparability"] = establish_comparability(connection, stats)

    for track, sheet, name, path in resolved:
        source_sha = digests[name]
        source_id = f"SRC-XLSX-{track}-{source_sha[:12]}"
        data_rows = 0
        for kind, payload in read_workbook(path, sheet):
            if kind == "header":
                header_row, headers_seen, _layout = payload
                cursor = connection.execute(
                    "INSERT INTO source_document (source_id, path, sha256, size_bytes, worksheet, track, "
                    "header_row, data_rows, source_authority, source_scope) VALUES (?,?,?,?,?,?,?,?,?,?)",
                    (source_id, name, source_sha, path.stat().st_size, sheet, track, header_row, 0,
                     "USER_PROVIDED_NOT_INDEPENDENTLY_VERIFIED", "READ_ONLY_PRIMARY_INPUT"))
                source_pk = cursor.lastrowid
                stats["sources"] += 1
                header_letters.update({heading: column for heading, column in headers_seen.items()})
                rows = [(source_pk, field, headers_seen.get(heading), heading)
                        for field, heading in COLUMNS.items()]
                rows += [(source_pk, f"extra:{heading}", column, heading)
                         for heading, column in headers_seen.items()]
                connection.executemany("INSERT OR REPLACE INTO header_map VALUES (?,?,?,?)", rows)
                continue

            row_number, fields = payload
            if not text(fields.get(COLUMNS["major_name"])):
                continue
            data_rows += 1
            stats["rows"] += 1
            row = clean_row(track, fields, source_id, row_number, issues)
            if not row["institution_code"] or not row["major_code"] or not row["group_code"]:
                issues.append((source_id, row_number, None, "MISSING_IDENTITY", None,
                               "row skipped: institution, group or major code missing"))
                continue

            institution_id = f"INST-{row['institution_code']}"
            institution_pk = institutions.get(institution_id)
            if institution_pk is None:
                cursor = connection.execute(
                    "INSERT INTO institution (institution_id, institution_code, canonical_name, province, "
                    "city, city_tier, ownership, institution_type, level_label, affiliation, "
                    "institution_ranking, academic_ranking, academic_grade, postgraduate_rate, "
                    "master_program_count, doctor_program_count, master_programs, doctor_programs, "
                    "rename_history, institution_level, admission_rule, charter_url, source_pk, "
                    "first_source_row) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (institution_id, row["institution_code"],
                     row["institution_name"] or row["institution_code"],
                     row["province"], row["city"], row["city_tier"], row["ownership"],
                     row["institution_type"], row["level_label"], row["affiliation"],
                     row["institution_ranking"], row["academic_ranking"], row["academic_grade"],
                     row["postgraduate_rate"], row["master_program_count"], row["doctor_program_count"],
                     row["master_programs"], row["doctor_programs"], row["rename_history"],
                     row["institution_level"], row["admission_rule"], row["charter_url"],
                     source_pk, row_number))
                institution_pk = cursor.lastrowid
                institutions[institution_id] = institution_pk
                stats["institutions"] += 1
                tag_rows = []
                for tag_kind, raw in (("LABEL", row["institution_labels"]),
                                      ("LEVEL", row["institution_level"])):
                    for tag in (raw or "").split("/"):
                        tag = tag.strip()
                        key = (institution_pk, tag_kind, tag)
                        if tag and key not in tags_seen:
                            tags_seen.add(key)
                            tag_rows.append(key)
                connection.executemany("INSERT OR IGNORE INTO institution_tag VALUES (?,?,?)", tag_rows)

            group_id = f"GRP-{track}-{row['institution_code']}-{row['group_code']}-{short_hash(row['batch'], row['admission_type'])}"
            group_pk = groups.get(group_id)
            if group_pk is None:
                cursor = connection.execute(
                    "INSERT INTO admission_group (group_id, institution_pk, track, plan_year, province, "
                    "batch, stage, admission_type, admission_type_raw, admission_type_inferred, group_code, "
                    "group_compound_code, group_major_count, group_plan_count, group_majors_raw, source_pk, "
                    "source_row) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (group_id, institution_pk, track, PLAN_YEAR, PROVINCE, row["batch"], None,
                     row["admission_type"], row["admission_type_raw"], row["admission_type_inferred"],
                     row["group_code"], row["group_compound_code"], row["group_major_count"],
                     row["group_plan_count"], row["group_majors_raw"], source_pk, row_number))
                group_pk = cursor.lastrowid
                groups[group_id] = group_pk
                stats["groups"] += 1

            offering_id = f"OFF-{group_id[4:]}-{row['major_code']}"
            offering_key = (group_pk, row["major_code"])
            if offering_key in offer_key_seen:
                stats["duplicate_offering_keys"] += 1
                issues.append((source_id, row_number, COLUMNS["major_code"], "DUPLICATE_OFFERING_KEY",
                               row["major_code"], "duplicate within group; row skipped"))
                continue
            offer_key_seen.add(offering_key)
            cursor = connection.execute(
                "INSERT INTO offering (offering_id, group_pk, major_code, major_name, major_note, "
                "other_note, degree_level, level_label, category, category_class, is_new, "
                "major_master_programs, major_doctor_programs, source_pk, source_row) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (offering_id, group_pk, row["major_code"], row["major_name"], row["major_note"],
                 row["other_note"], row["degree_level"], row["level_label"], row["category"],
                 row["category_class"], row["is_new"], row["major_master_programs"],
                 row["major_doctor_programs"], source_pk, row_number))
            offering_pk = cursor.lastrowid
            offer_pks[offering_id] = offering_pk
            stats["offerings"] += 1
            offering_tag_rows = []
            for tag in (row["major_level"] or "").split("/"):
                tag = tag.strip()
                key = (offering_pk, "MAJOR_LEVEL", tag)
                if tag and key not in offering_tags_seen:
                    offering_tags_seen.add(key)
                    offering_tag_rows.append(key)
            connection.executemany("INSERT OR IGNORE INTO offering_tag VALUES (?,?,?)", offering_tag_rows)

            requirement_key = (group_pk, row["subject_requirement"], row["rule_kind"],
                               ",".join(row["requirement_subjects"]), row["requirement_parse_status"])
            requirement_pk = requirements.get(requirement_key)
            if requirement_pk is None:
                requirement_seq += 1
                cursor = connection.execute(
                    "INSERT INTO requirement (requirement_id, scope, group_pk, offering_pk, plan_year, "
                    "raw_text, rule_kind, subjects, parse_status, source_pk, source_row) "
                    "VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    (f"REQ-{requirement_seq:06d}", "group", group_pk, None, PLAN_YEAR,
                     row["subject_requirement"], row["rule_kind"],
                     ",".join(row["requirement_subjects"]), row["requirement_parse_status"],
                     source_pk, row_number))
                requirement_pk = cursor.lastrowid
                requirements[requirement_key] = requirement_pk
                stats["requirements"] += 1
                if row["rule_kind"] == "unknown":
                    stats["requirement_unresolved"] += 1
            requirement_offering.append((offering_id, group_id, requirement_pk))

            stats["plan_records"] += 1
            if row["plan_count"] is not None:
                stats["plan_count_sum"] += row["plan_count"]
            if row["tuition_amount"] is None and row["tuition_raw"] is not None:
                stats["tuition_unresolved"] += 1
            evidence = row["_evidence"]
            connection.execute(
                "INSERT INTO plan_record (plan_id, offering_pk, plan_year, plan_count, group_plan_count, "
                "group_major_count, tuition_amount, tuition_raw, tuition_note, tuition_currency, "
                "tuition_period, tuition_comparable, study_years, requirement_pk, source_pk, source_row, "
                "evidence_plan_count_cell, evidence_tuition_cell, evidence_requirement_cell) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (f"PLAN-{offering_id[4:]}", offering_pk, PLAN_YEAR, row["plan_count"],
                 row["group_plan_count"], row["group_major_count"], row["tuition_amount"],
                 row["tuition_raw"], row["tuition_note"], None, None, 0, row["study_years"],
                 requirement_pk, source_pk, row_number, evidence.get("plan_count"),
                 evidence.get("tuition"), evidence.get("subject_requirement")))

            for observation in history_observations(fields, source_id, row_number, issues, track):
                is_group = observation["subject_type"] == "group"
                values = (
                    observation["subject_type"],
                    group_pk if is_group else None,
                    None if is_group else offering_pk,
                    observation["source_year"], observation["metric_type"],
                    observation["score"], observation["rank"], observation["rank_is_valid"],
                    observation["admitted_count"],
                    None, None, None, None,  # observed_track / batch / admission type / score_basis
                    observation["comparability"],
                    source_pk, row_number,
                )
                key = (observation["source_year"], observation["metric_type"],
                       observation["subject_type"], group_pk if is_group else offering_pk)
                previous = observations.get(key)
                if previous is None:
                    observations[key] = values
                elif previous[5:9] == values[5:9]:
                    # Group-level history columns repeat on every row of the group.
                    stats["repeated_group_observations"] += 1
                else:
                    stats["source_conflicts"] += 1
                    issues.append((source_id, row_number, None, "SOURCE_CONFLICT",
                                   "|".join(str(part) for part in key),
                                   "same subject/year/metric carries different values; first kept, "
                                   "comparability flagged"))
                    observations[key] = values[:13] + ("SOURCE_CONFLICT",) + values[14:]

        connection.execute("UPDATE source_document SET data_rows = ? WHERE source_pk = ?",
                           (data_rows, source_pk))

    # A requirement is stored once per group. When a group really does carry more than one
    # rule, each offering gets its own row so the rule is never shared incorrectly.
    per_group: dict[str, set[int]] = {}
    for _offering_id, group_id, requirement_pk in requirement_offering:
        per_group.setdefault(group_id, set()).add(requirement_pk)
    split_groups = {group_id for group_id, ids in per_group.items() if len(ids) > 1}
    if split_groups:
        stats["group_requirement_varies"] = len(split_groups)
        detail = connection.execute(
            "SELECT requirement_pk, source_pk, source_row, raw_text, rule_kind, subjects, parse_status "
            "FROM requirement").fetchall()
        by_pk = {row[0]: row for row in detail}
        replays = []
        updates = []
        for offering_id, group_id, requirement_pk in requirement_offering:
            if group_id not in split_groups:
                continue
            requirement_seq += 1
            _, source_pk, source_row, raw_text, rule_kind, subjects, parse_status = by_pk[requirement_pk]
            replays.append((f"REQ-{requirement_seq:06d}", "offering", None, offer_pks[offering_id],
                            PLAN_YEAR, raw_text, rule_kind, subjects, parse_status, source_pk, source_row))
            updates.append((f"REQ-{requirement_seq:06d}", offer_pks[offering_id]))
        connection.executemany(
            "INSERT INTO requirement (requirement_id, scope, group_pk, offering_pk, plan_year, raw_text, "
            "rule_kind, subjects, parse_status, source_pk, source_row) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            [row for row in replays])
        connection.executemany(
            "UPDATE plan_record SET requirement_pk = (SELECT r.requirement_pk FROM requirement r "
            "WHERE r.requirement_id = ?) WHERE offering_pk = ?", updates)
        connection.executemany(
            "INSERT INTO data_issue (source_pk, source_row, field_name, issue_code, raw_value, detail) "
            "SELECT source_pk, source_row, ?, ?, group_id, ? FROM requirement "
            "WHERE scope='group' AND group_id IN (%s)" % ",".join("?" * len(split_groups)),
            [COLUMNS["subject_requirement"], "GROUP_REQUIREMENT_VARIES",
             "group carries more than one selection rule; split into per-offering rows",
             *sorted(split_groups)])

    connection.executemany(
        "INSERT INTO admission_observation (subject_type, group_pk, offering_pk, source_year, metric_type, "
        "score, rank, rank_is_valid, admitted_count, observed_track, observed_batch, "
        "observed_admission_type, score_basis, comparability, source_pk, source_row) "
        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        list(observations.values()))
    stats["observations"] = len(observations)

    column_map = sorted({
        (year, metric_type, score_column, rank_column, count_column,
         header_letters.get(score_column), header_letters.get(rank_column))
        for year, metrics in HISTORY_METRICS.items()
        for _subject_type, metric_type, score_column, rank_column, count_column in metrics
    })
    connection.executemany(
        "INSERT INTO history_column_map VALUES (?,?,?,?,?,?,?)", column_map)

    connection.executemany(
        "INSERT INTO data_issue (source_pk, source_row, field_name, issue_code, raw_value, detail) "
        "SELECT source_pk, ?, ?, ?, ?, ? FROM source_document WHERE source_id = ?",
        [(row, field, code, raw, detail, source_id)
         for source_id, row, field, code, raw, detail in issues])
    stats["issues"] = connection.execute("SELECT COUNT(*) FROM data_issue").fetchone()[0]
    stats["issues_collapsed"] = collapse_repeated_issues(connection)

    connection.execute("INSERT INTO meta VALUES ('row_count', ?)", (str(stats["rows"]),))
    connection.execute(MATCH_POOL_SQL)
    connection.execute(FACET_VIEW_SQL)
    connection.execute(SCORE_DISTRIBUTION_VIEW_SQL)
    connection.commit()

    stats["match_pool_rows"] = connection.execute("SELECT COUNT(*) FROM match_pool").fetchone()[0]

    stats["observation_metrics"] = {metric: count for metric, count in connection.execute(
        "SELECT metric_type, COUNT(*) FROM admission_observation GROUP BY metric_type ORDER BY metric_type")}
    stats["observations_with_rank"] = connection.execute(
        "SELECT COUNT(*) FROM admission_observation WHERE rank IS NOT NULL").fetchone()[0]
    stats["reference_year_capacity"] = {str(year): count for year, count in connection.execute(
        "SELECT source_year, COUNT(*) FROM admission_observation o JOIN offering f ON f.offering_pk = o.offering_pk "
        "WHERE o.metric_type='major_admission_min' AND o.rank IS NOT NULL "
        "GROUP BY o.source_year ORDER BY o.source_year DESC")}
    stats["issue_codes"] = {code: count for code, count in connection.execute(
        "SELECT issue_code, COUNT(*) FROM data_issue GROUP BY issue_code ORDER BY issue_code")}
    stats["issue_detail_status"] = "source-wide repeated notes are aggregated; per-value issues stay per row"

    connection.commit()
    connection.execute("ANALYZE")
    connection.execute("VACUUM")
    connection.commit()
    integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
    foreign_keys = connection.execute("PRAGMA foreign_key_check").fetchall()
    connection.close()
    if integrity != "ok" or foreign_keys:
        raise SystemExit(f"Database integrity failure: {integrity} {foreign_keys}")

    # Recorded relative to the app root: an absolute path would embed the workspace's directory
    # name, so renaming the project folder would leave the manifest pointing at a path that no
    # longer exists.
    try:
        stats["database"] = output.resolve().relative_to(APP).as_posix()
    except ValueError:
        stats["database"] = output.name
    stats["database_bytes"] = output.stat().st_size
    stats["database_sha256"] = sha256_file(output)
    stats["release_id"] = release_id
    stats["integrity_check"] = integrity
    if manifest_path is not None:
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(
            json.dumps({"format_version": "1.0.0", "builder": "pipelines/task03/build_admissions_db.py",
                        "source_sha256": digests, "combined_source_sha256": combined, **stats},
                       ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return stats


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook-root", type=Path, default=APP.parent)
    parser.add_argument("--output", type=Path, default=APP / "data/admissions/admissions.sqlite")
    parser.add_argument("--manifest", type=Path,
                        default=APP / "data/admissions/build-manifest.json")
    parser.add_argument("--no-manifest", action="store_true")
    parser.add_argument("--score-distribution", type=Path, default=SCORE_DISTRIBUTION_PATH,
                        help="extracted 一分一段表 JSON; omit with --no-score-distribution")
    parser.add_argument("--no-score-distribution", action="store_true",
                        help="build without score-to-rank support")
    args = parser.parse_args()
    stats = build(args.workbook_root, args.output,
                  None if args.no_manifest else args.manifest,
                  None if args.no_score_distribution else args.score_distribution)
    print(json.dumps({"status": "passed", **stats}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
