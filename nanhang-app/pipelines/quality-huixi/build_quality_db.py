"""Build the 荣县一中 quality SQLite database from the accuracy-v1.2 export.

Input is `data/quality-huixi/dataset.json`, produced by
`pipelines/quality-huixi/export_dataset.ts` running inside the pinned accuracy-v1.2 checkout
(commit 6f70eab4e6e9ecadc00149b1387103b45b5d8e2b). This script never re-parses the workbook and
never invents numbers: every analysis table is written from a row the parser produced, or from a
documented aggregation of those rows.

Identity rule (recorded per person in `person.identity_basis`):
  * one person = (姓名, 科类, 选科组合) across all exams, which never merges the two students who
    share a name but sit in different tracks or combinations;
  * class-16 art rows carry a one-exam 艺术 combination and are folded back into the single
    same-name person instead of creating a phantom second student.

Privacy: student names and code material stay local. The database stores only SHA-256 of each
issued code; raw codes go to `private/` outside the delivered source pack, and the per-student
release files are named by code hash.

Determinism: rows are written in workbook scan order, so the same dataset.json plus the same salt
produces the same rows and the same codes.
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import secrets
import sqlite3
from pathlib import Path

APP = Path(__file__).resolve().parents[2]
WORKSPACE = APP.parent
DATASET = APP / "data/quality-huixi/dataset.json"
DATABASE = APP / "data/quality-huixi/quality-huixi.sqlite"
CODES = WORKSPACE / "private/quality-huixi-codes.csv"
SALT = WORKSPACE / "private/quality-huixi-salt.txt"

SCHEMA_VERSION = "1.0.0"
PARSER_COMMIT = "6f70eab4e6e9ecadc00149b1387103b45b5d8e2b"
ART_COMBINATION = "艺术"
ART_CLASS = 16
KNOWN_ORDER = {"入口", "1册", "21", "22", "2册", "31", "32", "33", "3册", "41", "4半", "4月",
               "43", "4册", "51"}

SCHEMA = """
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE source_document (
  source_pk INTEGER PRIMARY KEY,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  sha256 TEXT,
  size_bytes INTEGER,
  note TEXT
);

CREATE TABLE data_profile (
  profile_pk INTEGER PRIMARY KEY CHECK (profile_pk = 1),
  overall_confidence REAL,
  score_header_row INTEGER,
  subject_completeness REAL,
  threshold_completeness REAL,
  item_coverage REAL,
  reconstructed_totals INTEGER,
  skipped_rows INTEGER,
  rejected_rows INTEGER
);

CREATE TABLE field_match (
  field TEXT PRIMARY KEY,
  column_index INTEGER,
  header TEXT NOT NULL,
  strategy TEXT NOT NULL,
  confidence REAL NOT NULL
);

CREATE TABLE capability (
  capability_id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  available INTEGER NOT NULL,
  confidence REAL NOT NULL,
  reason TEXT NOT NULL
);

CREATE TABLE exam (
  exam_pk INTEGER PRIMARY KEY,
  exam_code TEXT NOT NULL UNIQUE,
  ordinal INTEGER NOT NULL,
  raw_labels TEXT NOT NULL,
  is_order_known INTEGER NOT NULL,
  student_rows INTEGER NOT NULL
);

CREATE TABLE exam_track_summary (
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  track TEXT NOT NULL,
  students INTEGER NOT NULL,
  top_eligible INTEGER NOT NULL,
  undergraduate_eligible INTEGER NOT NULL,
  top_count INTEGER,
  top_rate REAL,
  undergraduate_count INTEGER,
  undergraduate_rate REAL,
  PRIMARY KEY (exam_pk, track)
);

CREATE TABLE person (
  person_pk INTEGER PRIMARY KEY,
  person_key TEXT NOT NULL UNIQUE,
  public_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  track TEXT NOT NULL,
  combination TEXT NOT NULL,
  class_no INTEGER NOT NULL,
  class_label TEXT NOT NULL,
  class_type TEXT NOT NULL,
  exam_count INTEGER NOT NULL,
  first_exam TEXT NOT NULL,
  last_exam TEXT NOT NULL,
  identity_basis TEXT NOT NULL,
  identity_note TEXT
);

CREATE TABLE person_code (
  person_pk INTEGER PRIMARY KEY REFERENCES person(person_pk),
  code6_sha256 TEXT NOT NULL UNIQUE,
  token_sha256 TEXT NOT NULL UNIQUE,
  issued_at TEXT NOT NULL,
  note TEXT
);

CREATE TABLE person_class_history (
  person_pk INTEGER NOT NULL REFERENCES person(person_pk),
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  class_no INTEGER NOT NULL,
  class_type TEXT NOT NULL,
  combination TEXT NOT NULL,
  raw_exam TEXT NOT NULL,
  source_sheet TEXT,
  source_row INTEGER,
  PRIMARY KEY (person_pk, exam_pk)
);

CREATE TABLE score_observation (
  observation_pk INTEGER PRIMARY KEY,
  person_pk INTEGER NOT NULL REFERENCES person(person_pk),
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  class_no INTEGER NOT NULL,
  track TEXT NOT NULL,
  total REAL NOT NULL,
  total_origin TEXT NOT NULL,
  city_rank INTEGER,
  school_rank INTEGER,
  subject_present INTEGER NOT NULL,
  subject_expected INTEGER NOT NULL,
  source_sheet TEXT,
  source_row INTEGER,
  UNIQUE (person_pk, exam_pk)
);

CREATE TABLE subject_score (
  subject_score_pk INTEGER PRIMARY KEY,
  observation_pk INTEGER NOT NULL REFERENCES score_observation(observation_pk),
  subject TEXT NOT NULL,
  value REAL,
  state TEXT NOT NULL,
  max_score REAL,
  score_basis TEXT,
  UNIQUE (observation_pk, subject)
);

CREATE TABLE threshold (
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  track TEXT NOT NULL,
  top_total REAL,
  undergraduate_total REAL,
  PRIMARY KEY (exam_pk, track)
);

CREATE TABLE threshold_subject (
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  track TEXT NOT NULL,
  tier TEXT NOT NULL,
  subject TEXT NOT NULL,
  line REAL NOT NULL,
  PRIMARY KEY (exam_pk, track, tier, subject)
);

CREATE TABLE class_summary (
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  class_no INTEGER NOT NULL,
  label TEXT NOT NULL,
  track TEXT NOT NULL,
  class_type TEXT NOT NULL,
  students INTEGER NOT NULL,
  average REAL,
  top_count INTEGER,
  top_rate REAL,
  top_metric_status TEXT,
  undergraduate_count INTEGER,
  undergraduate_rate REAL,
  undergraduate_metric_status TEXT,
  subject_averages TEXT NOT NULL,
  PRIMARY KEY (exam_pk, class_no)
);

CREATE TABLE class_benchmark (
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  class_no INTEGER NOT NULL,
  peer_group TEXT NOT NULL,
  peer_average REAL,
  average_delta REAL,
  peer_top_rate REAL,
  top_rate_delta REAL,
  peer_undergraduate_rate REAL,
  undergraduate_rate_delta REAL,
  peer_rank INTEGER NOT NULL,
  peer_size INTEGER NOT NULL,
  PRIMARY KEY (exam_pk, class_no)
);

CREATE TABLE class_subject_summary (
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  class_no INTEGER NOT NULL,
  subject TEXT NOT NULL,
  students INTEGER NOT NULL,
  average REAL,
  max REAL,
  top_effective_count INTEGER,
  top_effective_rate REAL,
  undergraduate_effective_count INTEGER,
  undergraduate_effective_rate REAL,
  effective_line REAL,
  effective_rate REAL,
  PRIMARY KEY (exam_pk, class_no, subject)
);

CREATE TABLE subject_summary (
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  subject TEXT NOT NULL,
  students INTEGER NOT NULL,
  average REAL,
  max REAL,
  top_eligible INTEGER NOT NULL,
  undergraduate_eligible INTEGER NOT NULL,
  top_effective_count INTEGER,
  top_effective_rate REAL,
  undergraduate_effective_count INTEGER,
  undergraduate_effective_rate REAL,
  effective_line REAL,
  effective_rate REAL,
  PRIMARY KEY (exam_pk, subject)
);

CREATE TABLE score_segment (
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  segment_id TEXT NOT NULL,
  label TEXT NOT NULL,
  intent TEXT NOT NULL,
  student_count INTEGER NOT NULL,
  rate REAL NOT NULL,
  average REAL NOT NULL,
  PRIMARY KEY (exam_pk, segment_id)
);

CREATE TABLE exam_distribution (
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  bin_label TEXT NOT NULL,
  start REAL NOT NULL,
  end REAL NOT NULL,
  student_count INTEGER NOT NULL,
  rate REAL NOT NULL,
  PRIMARY KEY (exam_pk, bin_label)
);

CREATE TABLE critical_student (
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  person_pk INTEGER NOT NULL REFERENCES person(person_pk),
  class_no INTEGER NOT NULL,
  total REAL NOT NULL,
  top_diff REAL,
  undergraduate_diff REAL,
  critical_tiers TEXT NOT NULL,
  weak_subjects TEXT NOT NULL,
  PRIMARY KEY (exam_pk, person_pk)
);

CREATE TABLE question (
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  subject TEXT NOT NULL,
  question_index INTEGER NOT NULL,
  question TEXT NOT NULL,
  max_score REAL,
  max_score_source TEXT,
  knowledge TEXT NOT NULL,
  PRIMARY KEY (exam_pk, subject, question_index)
);

CREATE TABLE item_response (
  item_response_pk INTEGER PRIMARY KEY,
  person_pk INTEGER NOT NULL REFERENCES person(person_pk),
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  subject TEXT NOT NULL,
  scores TEXT NOT NULL,
  UNIQUE (person_pk, exam_pk, subject)
);

CREATE TABLE knowledge_summary (
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  subject TEXT NOT NULL,
  knowledge TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  response_count INTEGER NOT NULL,
  earned REAL NOT NULL,
  possible REAL NOT NULL,
  rate REAL NOT NULL,
  priority TEXT NOT NULL,
  PRIMARY KEY (exam_pk, subject, knowledge)
);

CREATE TABLE knowledge_student (
  person_pk INTEGER NOT NULL REFERENCES person(person_pk),
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  subject TEXT NOT NULL,
  knowledge TEXT NOT NULL,
  earned REAL NOT NULL,
  possible REAL NOT NULL,
  question_responses INTEGER NOT NULL,
  rate REAL NOT NULL,
  PRIMARY KEY (person_pk, exam_pk, subject, knowledge)
);

CREATE TABLE rank_check (
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  track TEXT NOT NULL,
  person_pk INTEGER NOT NULL REFERENCES person(person_pk),
  computed_rank INTEGER NOT NULL,
  source_rank INTEGER,
  difference INTEGER,
  PRIMARY KEY (exam_pk, person_pk)
);

CREATE TABLE trend_point (
  exam_pk INTEGER PRIMARY KEY REFERENCES exam(exam_pk),
  students INTEGER NOT NULL,
  average REAL,
  top_count INTEGER,
  undergraduate_count INTEGER
);

CREATE TABLE insight (
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  insight_id TEXT NOT NULL,
  tone TEXT NOT NULL,
  title TEXT NOT NULL,
  finding TEXT NOT NULL,
  action TEXT NOT NULL,
  PRIMARY KEY (exam_pk, insight_id)
);

CREATE TABLE recommendation (
  exam_pk INTEGER NOT NULL REFERENCES exam(exam_pk),
  ordinal INTEGER NOT NULL,
  text TEXT NOT NULL,
  PRIMARY KEY (exam_pk, ordinal)
);

CREATE TABLE methodology (
  ordinal INTEGER PRIMARY KEY,
  text TEXT NOT NULL
);

CREATE TABLE data_issue (
  issue_pk INTEGER PRIMARY KEY,
  issue_code TEXT NOT NULL,
  level TEXT NOT NULL,
  module TEXT,
  exam_code TEXT,
  person_pk INTEGER,
  field TEXT,
  state TEXT,
  raw_value TEXT,
  source_sheet TEXT,
  source_row INTEGER,
  message TEXT NOT NULL,
  affected_count INTEGER
);

CREATE TABLE score_conflict (
  conflict_pk INTEGER PRIMARY KEY,
  conflict_key TEXT NOT NULL,
  resolution TEXT NOT NULL,
  candidates INTEGER NOT NULL,
  note TEXT NOT NULL
);

CREATE TABLE score_conflict_candidate (
  conflict_pk INTEGER NOT NULL REFERENCES score_conflict(conflict_pk),
  exam_code TEXT NOT NULL,
  class_no INTEGER NOT NULL,
  name TEXT NOT NULL,
  total REAL,
  source_sheet TEXT,
  source_row INTEGER,
  subjects TEXT NOT NULL
);

CREATE INDEX idx_person_name ON person (display_name);
CREATE INDEX idx_person_class ON person (class_no);
CREATE INDEX idx_history_exam ON person_class_history (exam_pk, class_no);
CREATE INDEX idx_observation_person ON score_observation (person_pk, exam_pk);
CREATE INDEX idx_observation_exam ON score_observation (exam_pk, class_no);
CREATE INDEX idx_subject_score_subject ON subject_score (subject, state);
CREATE INDEX idx_critical_exam ON critical_student (exam_pk, class_no);
CREATE INDEX idx_knowledge_student ON knowledge_student (person_pk, subject);
CREATE INDEX idx_knowledge_exam ON knowledge_summary (exam_pk, subject, rate);
CREATE INDEX idx_issue_code ON data_issue (issue_code);
CREATE INDEX idx_response_person ON item_response (person_pk, exam_pk);
"""

VIEWS = """
CREATE VIEW v_person_exam AS
SELECT p.person_key, p.display_name, p.track, p.combination, e.exam_code,
       o.class_no, o.total, o.city_rank, o.school_rank, o.subject_present, o.subject_expected,
       (SELECT top_total FROM threshold t WHERE t.exam_pk = o.exam_pk AND t.track = p.track)
         AS top_total,
       (SELECT undergraduate_total FROM threshold t
         WHERE t.exam_pk = o.exam_pk AND t.track = p.track) AS undergraduate_total
FROM score_observation o
JOIN person p ON p.person_pk = o.person_pk
JOIN exam e ON e.exam_pk = o.exam_pk;

CREATE VIEW v_person_subject AS
SELECT p.person_key, p.display_name, e.exam_code, s.subject, s.value, s.state, s.max_score,
       (SELECT line FROM threshold_subject l
         WHERE l.exam_pk = o.exam_pk AND l.track = p.track AND l.tier = 'undergraduate'
           AND l.subject = s.subject) AS undergraduate_line,
       (SELECT line FROM threshold_subject l
         WHERE l.exam_pk = o.exam_pk AND l.track = p.track AND l.tier = 'top'
           AND l.subject = s.subject) AS top_line
FROM subject_score s
JOIN score_observation o ON o.observation_pk = s.observation_pk
JOIN person p ON p.person_pk = o.person_pk
JOIN exam e ON e.exam_pk = o.exam_pk;
"""


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def finite(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def blob(value) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def public_id(person_key: str) -> str:
    """Stable public identifier for one person so no shard has to expose the raw key."""
    return "rx:" + hashlib.sha256(person_key.encode("utf-8")).hexdigest()[:24]


TOKEN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def derive_codes(salt: bytes, person_key: str) -> tuple[str, str]:
    """Deterministic codes so that a rebuild never changes what a student was handed."""
    digest = hmac.new(salt, person_key.encode("utf-8"), hashlib.sha256).digest()
    code6 = f"{int.from_bytes(digest[:8], 'big') % 1_000_000:06d}"
    token = "".join(TOKEN_ALPHABET[digest[8 + index] % len(TOKEN_ALPHABET)] for index in range(8))
    return code6, token


def load_salt(path: Path) -> tuple[bytes, bool]:
    if path.exists():
        text = path.read_text(encoding="utf-8").strip()
        if len(text) == 64:
            return bytes.fromhex(text), False
    return secrets.token_bytes(32), True


def build_people(scores: list[dict]) -> tuple[list[dict], dict[str, list[str]], list[dict]]:
    """Group score rows into people, folding art-class rows into their owner."""
    regular: dict[str, list[dict]] = {}
    art: dict[str, list[dict]] = {}
    for row in scores:
        name = str(row["name"]).strip()
        if row.get("combination") == ART_COMBINATION or row.get("classNo") == ART_CLASS:
            art.setdefault(name, []).append(row)
        else:
            regular.setdefault(f"{name}|{row['track']}|{row['combination']}", []).append(row)

    people = [{"key": key, "rows": list(rows), "basis": "name+track+combination", "note": None}
              for key, rows in regular.items()]
    by_name: dict[str, list[dict]] = {}
    for person in people:
        by_name.setdefault(person["key"].split("|")[0], []).append(person)

    notes = []
    for name, rows in art.items():
        owners = by_name.get(name, [])
        if len(owners) == 1:
            owners[0]["rows"].extend(rows)
            owners[0]["note"] = "含美术班（艺术组合）单次记录，已并入本人"
        else:
            people.append({"key": f"{name}|{ART_COMBINATION}|{ART_COMBINATION}", "rows": list(rows),
                           "basis": "art-only", "note": "只有美术班记录，未能与常规班记录归并"})
            notes.append({"issue_code": "ART_IDENTITY_UNRESOLVED", "level": "warning", "field": "姓名",
                          "raw_value": name,
                          "message": f"{name} 只有美术班（艺术组合）记录，未能与常规班记录归并，请核对学籍。"})
    return people, by_name, notes


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the 荣县一中 quality SQLite database.")
    parser.add_argument("--dataset", type=Path, default=DATASET)
    parser.add_argument("--database", type=Path, default=DATABASE)
    parser.add_argument("--codes", type=Path, default=CODES)
    parser.add_argument("--salt", type=Path, default=SALT)
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    raw = args.dataset.read_bytes()
    data = json.loads(raw)
    if data.get("element") != "nanming-quality-huixi-export":
        raise SystemExit("dataset.json is not a nanming-quality-huixi-export document")
    if data.get("schemaVersion") != "1.0.0":
        raise SystemExit(f"unsupported export schemaVersion {data.get('schemaVersion')}")
    source = data["source"]
    if source.get("parserCommit") != PARSER_COMMIT:
        raise SystemExit(f"dataset.json was not produced by the pinned parser {PARSER_COMMIT}")

    salt, salt_created = load_salt(args.salt)
    if salt_created:
        args.salt.parent.mkdir(parents=True, exist_ok=True)
        args.salt.write_text(salt.hex() + "\n", encoding="utf-8")

    exams: list[str] = data["exams"]
    exam_pk = {code: index + 1 for index, code in enumerate(exams)}
    class_profile = {entry["classNo"]: entry for entry in data["classes"]}
    scores: list[dict] = data["scores"]

    people, _, identity_notes = build_people(scores)
    scan_order = {}
    for person in people:
        scan_order[person["key"]] = min(
            int(((row.get("source") or {}).get("row")) or 10 ** 9) for row in person["rows"])
    people.sort(key=lambda person: (scan_order[person["key"]], person["key"]))

    persons: list[dict] = []
    for index, person in enumerate(people, start=1):
        rows = sorted(person["rows"], key=lambda row: (exam_pk[row["exam"]], row["classNo"]))
        home = next((row for row in rows
                     if row.get("combination") != ART_COMBINATION and row.get("classNo") != ART_CLASS),
                    rows[0])
        persons.append({
            "person_pk": index,
            "key": person["key"],
            "public_id": public_id(person["key"]),
            "name": str(home["name"]).strip(),
            "track": home["track"],
            "combination": home["combination"],
            "class_no": home["classNo"],
            "class_type": home.get("classType") or class_profile.get(home["classNo"], {}).get("type", "待配置"),
            "rows": rows,
            "first_exam": rows[0]["exam"],
            "last_exam": rows[-1]["exam"],
            "basis": person["basis"],
            "note": person["note"],
        })

    # One row per (exam, class, name) is the only key the item sheets share with the score sheet.
    person_by_sheet_key: dict[tuple[str, int, str], int] = {}
    for person in persons:
        for row in person["rows"]:
            person_by_sheet_key[(row["exam"], row["classNo"], str(row["name"]).strip())] = \
                person["person_pk"]

    if args.database.exists():
        args.database.unlink()
    args.database.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(args.database)
    connection.executescript(SCHEMA)
    connection.executescript(VIEWS)

    def insert(table: str, columns: list[str], rows) -> None:
        placeholders = ",".join("?" for _ in columns)
        connection.executemany(
            f"INSERT INTO {table} ({','.join(columns)}) VALUES ({placeholders})", rows)

    raw_labels: dict[str, set[str]] = {code: set() for code in exams}
    for row in scores:
        raw_labels[row["exam"]].add(str(row.get("rawExam") or ""))
    counts: dict[str, int] = {code: 0 for code in exams}
    for row in scores:
        counts[row["exam"]] += 1

    insert("meta", ["key", "value"], [
        ("schema_version", SCHEMA_VERSION),
        ("element", data["element"]),
        ("school", str(data["school"])),
        ("generated_at", data["exportedAt"]),
        ("parser_repo", source["parserRepo"]),
        ("parser_commit", source["parserCommit"]),
        ("dataset_sha256", sha256_bytes(raw)),
        ("source_workbook", source["name"]),
        ("source_workbook_bytes", str(source["bytes"])),
        ("identity_rule", "姓名+科类+选科组合；美术班（艺术组合）记录并入同名常规班学生"),
        ("code_note", "数据库只保存验证码的SHA-256；明文验证码在 private/ 目录，不随源码包交付"),
    ])
    insert("source_document", ["source_pk", "role", "name", "sha256", "size_bytes", "note"], [
        (1, "quality_huixi_export", args.dataset.name, sha256_bytes(raw), len(raw),
         "accuracy-v1.2 解析输出，含真实姓名，仅本机使用"),
        (2, "school_workbook", source["name"], None, source["bytes"],
         "源工作簿不复制进工程；哈希由建库日志单独记录"),
    ])
    profile = data["profile"]
    insert("data_profile", ["profile_pk", "overall_confidence", "score_header_row",
                            "subject_completeness", "threshold_completeness", "item_coverage",
                            "reconstructed_totals", "skipped_rows", "rejected_rows"], [
        (1, profile.get("overallConfidence"), profile.get("scoreHeaderRow"),
         profile.get("subjectCompleteness"), profile.get("thresholdCompleteness"),
         profile.get("itemCoverage"), profile.get("reconstructedTotals"), profile.get("skippedRows"),
         data.get("rejectedCount", 0)),
    ])
    insert("field_match", ["field", "column_index", "header", "strategy", "confidence"], [
        (item["field"], item["column"], item["header"], item["strategy"], item["confidence"])
        for item in profile.get("fieldMatches", [])
    ])
    insert("capability", ["capability_id", "label", "available", "confidence", "reason"], [
        (item["id"], item["label"], 1 if item["available"] else 0, item["confidence"], item["reason"])
        for item in profile.get("capabilities", [])
    ])
    insert("exam", ["exam_pk", "exam_code", "ordinal", "raw_labels", "is_order_known",
                    "student_rows"], [
        (exam_pk[code], code, index + 1,
         "/".join(sorted(label for label in raw_labels[code] if label)),
         1 if code in KNOWN_ORDER else 0, counts[code])
        for index, code in enumerate(exams)
    ])
    insert("exam_track_summary", ["exam_pk", "track", "students", "top_eligible",
                                  "undergraduate_eligible", "top_count", "top_rate",
                                  "undergraduate_count", "undergraduate_rate"], [
        (exam_pk[row["exam"]], row["track"], row["students"], row["topEligible"],
         row["undergraduateEligible"], row["topCount"], row["topRate"], row["undergraduateCount"],
         row["undergraduateRate"])
        for row in data["analysis"]["perExamTrack"]
    ])

    issued_at = data["exportedAt"]
    code_rows = []
    code_lines = ["public_id,person_key,姓名,班级,科类,选科,验证码6位,备用令牌,考试次数,首次考试,最近考试"]
    for person in persons:
        code6, token = derive_codes(salt, person["key"])
        code_rows.append((person["person_pk"], sha256_text(code6), sha256_text(token), issued_at,
                          "6位数字便于口头发放；接入服务器后必须限流，否则可被穷举"))
        code_lines.append(",".join([
            person["public_id"], person["key"], person["name"],
            class_profile.get(person["class_no"], {}).get("label", f"{person['class_no']}班"),
            person["track"], person["combination"], code6, token, str(len(person["rows"])),
            person["first_exam"], person["last_exam"]]))
    insert("person", ["person_pk", "person_key", "public_id", "display_name", "track",
                      "combination", "class_no", "class_label", "class_type", "exam_count",
                      "first_exam", "last_exam", "identity_basis", "identity_note"], [
        (person["person_pk"], person["key"], person["public_id"], person["name"], person["track"],
         person["combination"], person["class_no"],
         class_profile.get(person["class_no"], {}).get("label", f"{person['class_no']}班"),
         person["class_type"], len(person["rows"]), person["first_exam"], person["last_exam"],
         person["basis"], person["note"])
        for person in persons
    ])
    insert("person_code", ["person_pk", "code6_sha256", "token_sha256", "issued_at", "note"],
           code_rows)
    args.codes.parent.mkdir(parents=True, exist_ok=True)
    args.codes.write_text("\n".join(code_lines) + "\n", encoding="utf-8")

    insert("person_class_history", ["person_pk", "exam_pk", "class_no", "class_type",
                                    "combination", "raw_exam", "source_sheet", "source_row"], [
        (person["person_pk"], exam_pk[row["exam"]], row["classNo"],
         row.get("classType") or class_profile.get(row["classNo"], {}).get("type", "待配置"),
         row["combination"], str(row.get("rawExam") or ""),
         (row.get("source") or {}).get("sheet"), (row.get("source") or {}).get("row"))
        for person in persons for row in person["rows"]
    ])

    subject_order = data.get("subjectOrder", {})
    observations = []
    subject_scores = []
    observation_pk = 0
    for person in persons:
        for row in person["rows"]:
            observation_pk += 1
            states = row.get("subjectStates") or {}
            values = row.get("subjects") or {}
            expected = len(subject_order.get(row["track"], [])) or len(states)
            present = sum(1 for value in values.values() if finite(value))
            observations.append((
                observation_pk, person["person_pk"], exam_pk[row["exam"]], row["classNo"],
                row["track"], row["total"], row.get("totalSource") or "source", row.get("cityRank"),
                row.get("schoolRank"), present, expected,
                (row.get("source") or {}).get("sheet"), (row.get("source") or {}).get("row")))
            for name in sorted(set(states) | set(values), key=str):
                value = values.get(name)
                subject_scores.append((
                    observation_pk, str(name), value if finite(value) else None,
                    states.get(name, "valid" if finite(value) else "missing"), None, None))
    insert("score_observation", ["observation_pk", "person_pk", "exam_pk", "class_no", "track",
                                 "total", "total_origin", "city_rank", "school_rank",
                                 "subject_present", "subject_expected", "source_sheet",
                                 "source_row"], observations)
    insert("subject_score", ["observation_pk", "subject", "value", "state", "max_score",
                             "score_basis"], subject_scores)

    insert("threshold", ["exam_pk", "track", "top_total", "undergraduate_total"], [
        (exam_pk[row["exam"]], row["track"], row["topTotal"], row["undergraduateTotal"])
        for row in data["thresholds"]
    ])
    insert("threshold_subject", ["exam_pk", "track", "tier", "subject", "line"], [
        (exam_pk[row["exam"]], row["track"], tier, subject, line)
        for row in data["thresholds"]
        for tier, field in (("top", "topSubjects"), ("undergraduate", "undergraduateSubjects"))
        for subject, line in (row.get(field) or {}).items() if finite(line)
    ])

    class_summaries = [entry for analysis in data["analysis"]["perExam"]
                       for entry in analysis["classes"]]
    exam_of_class = {entry["classNo"]: entry for entry in class_summaries}
    del exam_of_class
    class_summary_rows = []
    for analysis in data["analysis"]["perExam"]:
        for entry in analysis["classes"]:
            class_summary_rows.append((
                exam_pk[analysis["exam"]], entry["classNo"], entry["label"], entry["track"],
                entry["type"], entry["count"], entry["average"], entry["topCount"],
                entry["topRate"], (entry.get("topMetric") or {}).get("status"),
                entry["undergraduateCount"], entry["undergraduateRate"],
                (entry.get("undergraduateMetric") or {}).get("status"),
                blob(entry.get("subjectAverages") or {})))
    insert("class_summary", ["exam_pk", "class_no", "label", "track", "class_type", "students",
                             "average", "top_count", "top_rate", "top_metric_status",
                             "undergraduate_count", "undergraduate_rate",
                             "undergraduate_metric_status", "subject_averages"], class_summary_rows)
    insert("class_benchmark", ["exam_pk", "class_no", "peer_group", "peer_average",
                               "average_delta", "peer_top_rate", "top_rate_delta",
                               "peer_undergraduate_rate", "undergraduate_rate_delta", "peer_rank",
                               "peer_size"], [
        (exam_pk[analysis["exam"]], entry["classNo"], entry["peerGroup"], entry["peerAverage"],
         entry["averageDelta"], entry["peerTopRate"], entry["topRateDelta"],
         entry["peerUndergraduateRate"], entry["undergraduateRateDelta"], entry["peerRank"],
         entry["peerSize"])
        for analysis in data["analysis"]["perExam"] for entry in analysis["benchmarks"]
    ])
    insert("class_subject_summary", ["exam_pk", "class_no", "subject", "students", "average",
                                     "max", "top_effective_count", "top_effective_rate",
                                     "undergraduate_effective_count",
                                     "undergraduate_effective_rate", "effective_line",
                                     "effective_rate"], [
        (exam_pk[entry["exam"]], entry["classNo"], entry["subject"], entry["count"],
         entry["average"], entry["max"], entry["topEffectiveCount"], entry["topEffectiveRate"],
         entry["undergraduateEffectiveCount"], entry["undergraduateEffectiveRate"],
         entry["effectiveLine"], entry["effectiveRate"])
        for entry in data["analysis"]["perExamClassSubject"]
    ])
    insert("subject_summary", ["exam_pk", "subject", "students", "average", "max", "top_eligible",
                               "undergraduate_eligible", "top_effective_count",
                               "top_effective_rate", "undergraduate_effective_count",
                               "undergraduate_effective_rate", "effective_line", "effective_rate"], [
        (exam_pk[analysis["exam"]], entry["subject"], entry["count"], entry["average"],
         entry["max"], entry["topEligible"], entry["undergraduateEligible"],
         entry["topEffectiveCount"], entry["topEffectiveRate"],
         entry["undergraduateEffectiveCount"], entry["undergraduateEffectiveRate"],
         entry["effectiveLine"], entry["effectiveRate"])
        for analysis in data["analysis"]["perExam"] for entry in analysis["subjects"]
    ])
    insert("score_segment", ["exam_pk", "segment_id", "label", "intent", "student_count", "rate",
                             "average"], [
        (exam_pk[analysis["exam"]], entry["id"], entry["label"], entry["intent"], entry["count"],
         entry["rate"], entry["average"])
        for analysis in data["analysis"]["perExam"] for entry in analysis["segments"]
    ])
    insert("exam_distribution", ["exam_pk", "bin_label", "start", "end", "student_count", "rate"], [
        (exam_pk[analysis["exam"]], entry["label"], entry["start"], entry["end"], entry["count"],
         entry["rate"])
        for analysis in data["analysis"]["perExam"] for entry in analysis["distribution"]
    ])

    critical_rows = []
    for analysis in data["analysis"]["perExam"]:
        for entry in analysis["critical"]:
            person_pk_value = person_by_sheet_key.get(
                (analysis["exam"], entry["classNo"], str(entry["name"]).strip()))
            if person_pk_value is None:
                continue
            critical_rows.append((
                exam_pk[analysis["exam"]], person_pk_value, entry["classNo"], entry["total"],
                entry["topDiff"], entry["undergraduateDiff"], blob(entry["criticalTiers"]),
                blob(entry["weakSubjects"])))
    insert("critical_student", ["exam_pk", "person_pk", "class_no", "total", "top_diff",
                                "undergraduate_diff", "critical_tiers", "weak_subjects"],
           critical_rows)

    exam_by_label = dict(exam_pk)
    question_rows = []
    for key, bank in data["questionBanks"].items():
        subject, _, exam_code = key.partition("::")
        if exam_code not in exam_by_label:
            continue
        for position, question in enumerate(bank):
            question_rows.append((exam_by_label[exam_code], subject, position, question["question"],
                                  question.get("maxScore"), question.get("maxScoreSource"),
                                  question.get("knowledge") or ""))
    insert("question", ["exam_pk", "subject", "question_index", "question", "max_score",
                        "max_score_source", "knowledge"], question_rows)

    # Some item sheets also carry partial papers (自一/绵二/金一…) that never appear in the score
    # sheet. They cannot be linked to a person, so they are counted and reported instead of guessed.
    response_rows = []
    orphan_by_scope: dict[tuple[str, int], int] = {}
    for response in data["itemResponses"]:
        exam_code = response["exam"]
        person_pk_value = (person_by_sheet_key.get(
            (exam_code, response["classNo"], str(response["name"]).strip()))
            if exam_code in exam_by_label else None)
        if person_pk_value is None:
            scope = (exam_code, response["classNo"])
            orphan_by_scope[scope] = orphan_by_scope.get(scope, 0) + 1
            continue
        response_rows.append((person_pk_value, exam_by_label[exam_code], response["subject"],
                              blob(response["scores"])))
    insert("item_response", ["person_pk", "exam_pk", "subject", "scores"], response_rows)

    insert("knowledge_summary", ["exam_pk", "subject", "knowledge", "question_count",
                                 "response_count", "earned", "possible", "rate", "priority"], [
        (exam_pk[analysis["exam"]], entry["subject"], entry["knowledge"], entry["questionCount"],
         entry["responseCount"], entry["earned"], entry["possible"], entry["rate"],
         entry["priority"])
        for analysis in data["analysis"]["perExam"] for entry in analysis["knowledge"]
    ])

    # Per-student knowledge totals from the exported questions and responses, applying the same
    # rule accuracy-v1.2 uses for its own summaries: only full marks that came from the source,
    # only scores inside 0..maxScore, only labelled knowledge points.
    rollup: dict[tuple[int, int, str, str], list] = {}
    for response in data["itemResponses"]:
        bank = data["questionBanks"].get(f"{response['subject']}::{response['exam']}")
        if not bank or response["exam"] not in exam_by_label:
            continue
        person_pk_value = person_by_sheet_key.get(
            (response["exam"], response["classNo"], str(response["name"]).strip()))
        if person_pk_value is None:
            continue
        for position, score in enumerate(response["scores"]):
            question = bank[position] if position < len(bank) else None
            if not question or question.get("maxScoreSource") != "source":
                continue
            max_score = question.get("maxScore")
            if not finite(max_score) or max_score <= 0:
                continue
            if not finite(score) or score < 0 or score > max_score:
                continue
            knowledge = question.get("knowledge") or ""
            if not knowledge:
                continue
            bucket = rollup.setdefault(
                (person_pk_value, exam_by_label[response["exam"]], response["subject"], knowledge),
                [0.0, 0.0, 0])
            bucket[0] += score
            bucket[1] += max_score
            bucket[2] += 1
    insert("knowledge_student", ["person_pk", "exam_pk", "subject", "knowledge", "earned",
                                 "possible", "question_responses", "rate"], [
        (key[0], key[1], key[2], key[3], value[0], value[1], value[2],
         value[0] / value[1] if value[1] else 0.0)
        for key, value in sorted(rollup.items())
    ])

    # The report model's trend is cumulative, so the last exam's series is the whole-grade one.
    trend_source = data["analysis"]["perExam"][-1]["trend"] if data["analysis"]["perExam"] else []
    # The workbook's own 校赋名 column is checked against a rank recomputed from the 赋分 totals
    # inside this data set. Agreement is not assumed: for several exams the two disagree, and the
    # disagreement is reported per exam instead of one column being silently preferred.
    rank_rows = []
    for exam_code in exams:
        for track in ("物理类", "历史类"):
            entries = connection.execute(
                "SELECT o.person_pk, o.total, o.school_rank FROM score_observation o "
                "JOIN exam e ON e.exam_pk = o.exam_pk "
                "WHERE e.exam_code = ? AND o.track = ? ORDER BY o.total DESC",
                (exam_code, track)).fetchall()
            rank = 0
            previous = None
            for index, entry in enumerate(entries, start=1):
                if previous is None or entry[1] != previous:
                    rank = index
                    previous = entry[1]
                source = entry[2]
                rank_rows.append((exam_pk[exam_code], track, entry[0], rank, source,
                                  (source - rank) if source is not None else None))
    insert("rank_check", ["exam_pk", "track", "person_pk", "computed_rank", "source_rank",
                          "difference"], rank_rows)

    insert("trend_point", ["exam_pk", "students", "average", "top_count", "undergraduate_count"], [
        (exam_pk[point["exam"]], point["count"], point["average"], point["topCount"],
         point["undergraduateCount"])
        for point in trend_source if point["exam"] in exam_pk
    ])
    insert("insight", ["exam_pk", "insight_id", "tone", "title", "finding", "action"], [
        (exam_pk[analysis["exam"]], entry["id"], entry["tone"], entry["title"], entry["finding"],
         entry["action"])
        for analysis in data["analysis"]["perExam"] for entry in analysis["insights"]
    ])
    insert("recommendation", ["exam_pk", "ordinal", "text"], [
        (exam_pk[analysis["exam"]], index + 1, text)
        for analysis in data["analysis"]["perExam"]
        for index, text in enumerate(analysis["recommendations"])
    ])
    methodology = data["analysis"]["perExam"][-1]["methodology"] if data["analysis"]["perExam"] else []
    insert("methodology", ["ordinal", "text"],
           [(index + 1, text) for index, text in enumerate(methodology)])

    issue_rows = []
    issue_pk = 0
    for entry in data["issues"]:
        issue_pk += 1
        issue_rows.append((issue_pk, "IMPORT_" + str(entry["level"]).upper(), entry["level"],
                           entry.get("module"), None, None, None, None, None, None, None,
                           entry["message"], entry.get("affectedCount")))
    for entry in data["scoreIssues"]:
        issue_pk += 1
        person_pk_value = person_by_sheet_key.get(
            (entry.get("exam"), entry.get("classNo"), str(entry.get("name") or "").strip()))
        issue_rows.append((
            issue_pk, "SOURCE_CELL_" + str(entry["state"]).upper(), "info", "成绩",
            entry.get("exam"), person_pk_value, entry.get("field"), entry.get("state"),
            str(entry.get("rawValue") or ""), (entry.get("source") or {}).get("sheet"),
            (entry.get("source") or {}).get("row"),
            f"{entry.get('exam')} {entry.get('classNo')}班 {entry.get('name')} "
            f"{entry.get('field')}：{entry.get('state')}", 1))
    for entry in identity_notes:
        issue_pk += 1
        issue_rows.append((issue_pk, entry["issue_code"], entry["level"], "身份", None, None,
                           entry["field"], None, entry["raw_value"], None, None, entry["message"], 1))
    rank_agreement = connection.execute(
        "SELECT e.exam_code, COUNT(*) AS compared, "
        "SUM(CASE WHEN ABS(r.difference) <= 2 THEN 1 ELSE 0 END) AS matched "
        "FROM rank_check r JOIN exam e ON e.exam_pk = r.exam_pk "
        "WHERE r.source_rank IS NOT NULL GROUP BY e.exam_code ORDER BY e.ordinal").fetchall()
    for exam_code, compared, matched in rank_agreement:
        compared, matched = int(compared), int(matched)
        if compared and matched == compared:
            continue
        issue_pk += 1
        issue_rows.append((issue_pk, "RANK_SOURCE_DISAGREEMENT",
                           "warning" if matched * 2 < compared else "info", "成绩",
                           exam_code, None, "校赋名", "source_vs_recomputed", None, None, None,
                           f"「{exam_code}」工作簿自带的校赋名与本数据按赋分总分重算的校内位次"
                           f"不一致：{compared}条中{matched}条相符（容差2名）。页面显示重算位次，"
                           "源位次保留在库内供核对。", compared - matched))
    for (exam_code, class_no), count in sorted(orphan_by_scope.items()):
        issue_pk += 1
        issue_rows.append((issue_pk, "ITEM_RESPONSE_UNLINKED", "info", "小题", exam_code, None,
                           "小题明细", None, f"{class_no}班", None, None,
                           f"「{exam_code}」{class_no}班有{count}条小题明细在成绩表中没有对应的有效"
                           "学生行（本人该次总分缺失、冲突被排除，或该次未参加），未进入小题库；"
                           "成绩、班级与学科分析不受影响。", count))
    insert("data_issue", ["issue_pk", "issue_code", "level", "module", "exam_code", "person_pk",
                          "field", "state", "raw_value", "source_sheet", "source_row", "message",
                          "affected_count"], issue_rows)

    insert("score_conflict", ["conflict_pk", "conflict_key", "resolution", "candidates", "note"], [
        (index, conflict["key"], conflict["resolution"], len(conflict["candidates"]),
         "同考试同班同名成绩完全一致，保留最后排名" if conflict["resolution"] == "rank-only"
         else "同考试同班同名成绩存在差异，保留来源但不计入统计")
        for index, conflict in enumerate(data["scoreConflicts"], start=1)
    ])
    insert("score_conflict_candidate", ["conflict_pk", "exam_code", "class_no", "name", "total",
                                       "source_sheet", "source_row", "subjects"], [
        (index, candidate["exam"], candidate["classNo"], candidate["name"], candidate["total"],
         (candidate.get("source") or {}).get("sheet"), (candidate.get("source") or {}).get("row"),
         blob(candidate.get("subjects") or {}))
        for index, conflict in enumerate(data["scoreConflicts"], start=1)
        for candidate in conflict["candidates"]
    ])

    connection.commit()

    problems: list[str] = []
    checks: list[tuple[str, int, int]] = [
        ("person", connection.execute("SELECT COUNT(*) FROM person").fetchone()[0], len(persons)),
        ("score_observation",
         connection.execute("SELECT COUNT(*) FROM score_observation").fetchone()[0], len(scores)),
        ("question", connection.execute("SELECT COUNT(*) FROM question").fetchone()[0],
         sum(len(bank) for key, bank in data["questionBanks"].items()
             if key.partition("::")[2] in exam_by_label)),
        ("item_response", connection.execute("SELECT COUNT(*) FROM item_response").fetchone()[0],
         len(response_rows)),
        ("rank_check", connection.execute("SELECT COUNT(*) FROM rank_check").fetchone()[0],
         connection.execute("SELECT COUNT(*) FROM score_observation").fetchone()[0]),
        ("identity_probe", connection.execute(
            "SELECT COUNT(*) FROM person_class_history h JOIN score_observation o "
            "ON o.person_pk = h.person_pk AND o.exam_pk = h.exam_pk "
            "WHERE o.class_no <> h.class_no").fetchone()[0], 0),
    ]
    for name, actual, expected in checks:
        if actual != expected:
            problems.append(f"{name}: {actual} != {expected}")

    # Every per-student knowledge total must rebuild the parser's own per-exam summary.
    for (exam_code, subject, knowledge, earned, possible) in connection.execute(
            "SELECT e.exam_code, k.subject, k.knowledge, k.earned, k.possible "
            "FROM knowledge_summary k JOIN exam e ON e.exam_pk = k.exam_pk").fetchall():
        if possible <= 0:
            continue
        mine = connection.execute(
            "SELECT COALESCE(SUM(s.earned), 0), COALESCE(SUM(s.possible), 0) "
            "FROM knowledge_student s JOIN exam e ON e.exam_pk = s.exam_pk "
            "WHERE e.exam_code = ? AND s.subject = ? AND s.knowledge = ?",
            (exam_code, subject, knowledge)).fetchone()
        if abs(float(earned) - float(mine[0])) > 1e-6 or abs(float(possible) - float(mine[1])) > 1e-6:
            problems.append(f"knowledge totals differ for {exam_code}/{subject}/{knowledge}: "
                            f"parser {earned}/{possible} vs rollup {mine[0]}/{mine[1]}")
    connection.close()

    summary = {
        "database": str(args.database),
        "dataset_sha256": sha256_bytes(raw),
        "persons": len(persons),
        "observations": len(scores),
        "questions": len(question_rows),
        "item_responses": len(response_rows),
        "rank_disagreement": {code: {"compared": int(compared), "matched": int(matched)}
                              for code, compared, matched in rank_agreement},
        "item_scopes_unlinked": {f"{key[0]}/{key[1]}班": value
                                 for key, value in sorted(orphan_by_scope.items())},
        "identity_notes": len(identity_notes),
        "codes_file": str(args.codes),
        "salt_created": salt_created,
        "problems": problems,
    }
    if not args.quiet:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
