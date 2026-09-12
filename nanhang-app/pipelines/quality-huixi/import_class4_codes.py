"""Read owner-supplied identity workbook; retain only private suffix hashes, never full IDs."""
import argparse
import hashlib
import json
import re
import shutil
import sqlite3
import unicodedata
from datetime import datetime
from pathlib import Path

from export_identity import APP, build_entries, main as export_identity

def normalized_name(value):
    return ''.join(unicodedata.normalize('NFKC', str(value)).split())

def suffix(value):
    # Numeric Excel cells may already have lost precision. Never invent missing digits.
    if not isinstance(value, str):
        raise ValueError('Identity number must be stored as text')
    value = unicodedata.normalize('NFKC', value).strip().upper()
    if not re.fullmatch(r'\d{17}[\dX]', value):
        raise ValueError('Invalid identity number format')
    return value[-6:].replace('X', '0')

def match_codes(source_rows, people):
    eligible = {}
    for pid, name, class_no, _ in people:
        if class_no == 4:
            eligible.setdefault(normalized_name(name), []).append(pid)
    result = {}
    seen = set()
    for row in source_rows:
        if len(row) < 2 or not row[0]:
            raise ValueError('Missing identity columns')
        name = normalized_name(row[0])
        if name in seen or len(eligible.get(name, [])) != 1:
            raise ValueError('Duplicate or unmatched class 4 identity; no files changed')
        seen.add(name)
        result[eligible[name][0]] = hashlib.sha256(suffix(row[1]).encode()).hexdigest()
    if not result:
        raise ValueError('No class 4 identities found')
    return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--workbook', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    import openpyxl
    workbook = openpyxl.load_workbook(args.workbook, read_only=True, data_only=True)
    source = [row for sheet in workbook for row in sheet.iter_rows(values_only=True) if any(v is not None for v in row)]
    workbook.close()
    database = APP / 'data/quality-huixi/quality-huixi.sqlite'
    with sqlite3.connect(f'{database.as_uri()}?mode=ro', uri=True) as connection:
        people = connection.execute('SELECT p.public_id,p.display_name,p.class_no,c.code6_sha256 FROM person p JOIN person_code c ON p.person_pk=c.person_pk').fetchall()
    updates = match_codes(source, people)
    target = APP.parent / 'private/quality-code-overrides.json'
    previous = json.loads(target.read_text(encoding='utf-8'))['entries'] if target.exists() else {}
    merged = {**previous, **updates}
    entries = build_entries(people, merged)
    if any(not (APP / 'data/quality-huixi/release/shards' / shard).is_file() for shard in entries.values()):
        raise ValueError('Missing student shard')
    if args.apply:
        backup = target.parent / 'backups' / ('class4-codes-' + datetime.now().strftime('%Y%m%d-%H%M%S'))
        backup.mkdir(parents=True, exist_ok=False)
        for file in [target, target.parent / 'quality-identity.json']:
            if file.exists():
                shutil.copy2(file, backup / file.name)
        payload = {'version': 1, 'rule': 'class4-id-last6-X-as-0', 'source_sha256': hashlib.sha256(args.workbook.read_bytes()).hexdigest(), 'entries': merged}
        temporary = target.with_suffix('.tmp')
        temporary.write_text(json.dumps(payload), encoding='utf-8')
        temporary.replace(target)
        export_identity()
    print(json.dumps({'applied': args.apply, 'matched': len(updates), 'class4_total': sum(p[2] == 4 for p in people), 'remaining_original_codes': sum(p[2] == 4 and p[0] not in merged for p in people), 'other_classes_unchanged': True}))

if __name__ == '__main__':
    main()
