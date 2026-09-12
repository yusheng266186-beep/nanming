"""Build the PRIVATE name+code lookup. No names, codes or students are printed or shipped."""
from pathlib import Path
import hashlib
import json
import sqlite3
import unicodedata

APP = Path(__file__).resolve().parents[2]

def main():
    database = APP / 'data/quality-huixi/quality-huixi.sqlite'
    with sqlite3.connect(f'{database.as_uri()}?mode=ro', uri=True) as connection:
        rows = connection.execute('SELECT p.display_name, c.code6_sha256 FROM person p JOIN person_code c ON p.person_pk=c.person_pk').fetchall()
    entries = {}
    for name, code_hash in rows:
        normalized = ''.join(unicodedata.normalize('NFKC', name).split())
        key = hashlib.sha256(f'{normalized}\n{code_hash}'.encode()).hexdigest()
        shard = code_hash[:40] + '.json'
        if key in entries and entries[key] != shard:
            raise ValueError('Conflicting identity mapping')
        if not (APP / 'data/quality-huixi/release/shards' / shard).is_file():
            raise ValueError('Missing student shard')
        entries[key] = shard
    target = APP.parent / 'private/quality-identity.json'
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps({'version':1,'entries':entries}, ensure_ascii=False),encoding='utf-8')
    print(json.dumps({'status':'passed','identities':len(entries),'location':'private (excluded from distribution)'}))

if __name__ == '__main__':
    main()
