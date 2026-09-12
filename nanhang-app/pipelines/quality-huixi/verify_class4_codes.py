"""Verify every supplied class-4 code via the local SCF bundle; output counts only."""
import argparse
import hashlib
import json
import os
import socket
import sqlite3
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from import_class4_codes import APP, normalized_name, suffix
from export_identity import build_entries

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--workbook', type=Path, required=True)
    args = parser.parse_args()
    import openpyxl
    workbook = openpyxl.load_workbook(args.workbook, read_only=True, data_only=True)
    source = [row for sheet in workbook for row in sheet.iter_rows(values_only=True) if any(v is not None for v in row)]
    codes = {normalized_name(row[0]): suffix(row[1]) for row in source}
    x_names = {normalized_name(row[0]) for row in source if str(row[1]).strip().upper().endswith('X')}
    workbook.close()
    database = APP / 'data/quality-huixi/quality-huixi.sqlite'
    before = hashlib.sha256(database.read_bytes()).hexdigest()
    with sqlite3.connect(f'{database.as_uri()}?mode=ro', uri=True) as connection:
        people = connection.execute('SELECT p.public_id,p.display_name,p.class_no,c.code6_sha256 FROM person p JOIN person_code c ON p.person_pk=c.person_pk').fetchall()
    overrides = json.loads((APP.parent / 'private/quality-code-overrides.json').read_text(encoding='utf-8'))['entries']
    expected = build_entries(people, overrides)
    actual = json.loads((APP.parent / 'private/quality-identity.json').read_text(encoding='utf-8'))['entries']
    assert expected == actual, 'IDENTITY_EXPORT_MISMATCH'
    original = build_entries(people, {})
    assert len(original.keys() - actual.keys()) == len(overrides), 'OLD_CODES_NOT_REVOKED'
    assert len(actual) == len(people), 'IDENTITY_COUNT_CHANGED'
    # Entire untouched population, not a sample.
    unchanged = [p for p in people if p[0] not in overrides]
    assert all(actual.get(key) == value for key, value in build_entries(unchanged, {}).items()), 'OTHER_CODES_CHANGED'
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    env = os.environ.copy()
    env.pop('PORT', None)
    env.update(NANHANG_API_PORT=str(port), NANHANG_AI_UPSTREAM='fake', NANHANG_AI_PROFILE='development',
               NANHANG_QUALITY_IDENTITY_FILE=str(APP.parent / 'private/quality-identity.json'),
               NANHANG_QUALITY_RELEASE_DIR=str(APP / 'data/quality-huixi/release'))
    for key in ['NANHANG_SCHOOL_CLOUD_BASE','NANHANG_SCHOOL_KEY','NANHANG_REDIS_HOST','NANHANG_REDIS_PORT','NANHANG_REDIS_PASSWORD']:
        env.pop(key, None)
    process = subprocess.Popen(['node', str(APP / 'apps/api/dist-scf/app.js')], cwd=APP, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    base = f'http://127.0.0.1:{port}'
    passed = converted_x = 0
    try:
        for _ in range(60):
            try:
                urllib.request.urlopen(base + '/healthz', timeout=1).close()
                break
            except (OSError, urllib.error.URLError):
                time.sleep(.1)
        for pid, name, class_no, storage_hash in people:
            if pid not in overrides:
                continue
            code = codes[normalized_name(name)]
            body = json.dumps({'name': name, 'code': code}).encode()
            request = urllib.request.Request(base + '/v1/school/identify', data=body, headers={'content-type':'application/json'})
            with urllib.request.urlopen(request, timeout=15) as response:
                received = json.load(response)
            local = json.loads((APP / 'data/quality-huixi/release/shards' / (storage_hash[:40]+'.json')).read_text(encoding='utf-8'))
            assert received['shard'] == local, 'WRONG_STUDENT_RESPONSE'
            passed += 1
            converted_x += normalized_name(name) in x_names
    finally:
        process.terminate()
        process.wait(timeout=10)
    assert hashlib.sha256(database.read_bytes()).hexdigest() == before, 'DATABASE_MODIFIED'
    result = {'matched_http_passed': passed, 'x_as_zero_http_passed': converted_x, 'duplicate_suffix_count': len(codes)-len(set(codes.values())), 'old_lookup_keys_removed': len(original.keys()-actual.keys()),
              'unchanged_identities_checked': len(unchanged), 'class4_original_retained': sum(p[2]==4 for p in unchanged),
              'identities_total': len(actual), 'score_database_unchanged': True, 'scope': 'local SCF bundle, not deployed'}
    (APP / 'docs/verification/class4-codes-x0-result-2026-09-12.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result))

if __name__ == '__main__':
    main()
