"""Build the PRIVATE name+code lookup. No names, codes or students are printed or shipped."""
from pathlib import Path
import hashlib
import json
import sqlite3
import unicodedata

APP = Path(__file__).resolve().parents[2]

def build_entries(rows, overrides):
    """Override authentication only; retain existing encrypted shard locations."""
    unknown = set(overrides) - {row[0] for row in rows}
    if unknown:
        raise ValueError('Unknown override identities')
    entries = {}
    for public_id, name, class_no, storage_hash in rows:
        code_hash = overrides.get(public_id, storage_hash)
        if public_id in overrides and class_no != 4:
            raise ValueError('Override outside class 4')
        if not isinstance(code_hash, str) or len(code_hash) != 64 or any(c not in '0123456789abcdef' for c in code_hash):
            raise ValueError('Invalid query code hash')
        normalized = ''.join(unicodedata.normalize('NFKC', name).split())
        key = hashlib.sha256(f'{normalized}\n{code_hash}'.encode()).hexdigest()
        shard = storage_hash[:40] + '.json'
        if key in entries and entries[key] != shard:
            raise ValueError('Conflicting identity mapping')
        entries[key] = shard
    return entries

def main():
    database = APP / 'data/quality-huixi/quality-huixi.sqlite'
    with sqlite3.connect(f'{database.as_uri()}?mode=ro', uri=True) as connection:
        rows = connection.execute('SELECT p.public_id, p.display_name, p.class_no, c.code6_sha256 FROM person p JOIN person_code c ON p.person_pk=c.person_pk').fetchall()
    override_file = APP.parent / 'private/quality-code-overrides.json'
    overrides = json.loads(override_file.read_text(encoding='utf-8'))['entries'] if override_file.exists() else {}
    entries = build_entries(rows, overrides)
    for shard in entries.values():
        if not (APP / 'data/quality-huixi/release/shards' / shard).is_file():
            raise ValueError('Missing student shard')
    target = APP.parent / 'private/quality-identity.json'
    target.parent.mkdir(exist_ok=True)
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps({'version':1,'entries':entries}, ensure_ascii=False),encoding='utf-8')
    temporary.replace(target)
    print(json.dumps({'status':'passed','identities':len(entries),'location':'private (excluded from distribution)'}))

if __name__ == '__main__':
    main()
