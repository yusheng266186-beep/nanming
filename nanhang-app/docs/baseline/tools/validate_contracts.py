"""Validate the handoff contract artifacts, not a Nanhang application.

Run from any directory after installing requirements-contracts.txt.
"""
from pathlib import Path
import copy
import hashlib
import json
import sys
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))

def main():
    schemas = {}
    for path in sorted((ROOT / 'contracts').glob('*.schema.json')):
        schema = json.loads(path.read_text(encoding='utf-8'))
        Draft202012Validator.check_schema(schema)
        schemas[path.name] = Draft202012Validator(schema, format_checker=FormatChecker())
    checked = []
    for stem in ['student-profile', 'match-result', 'target-scenario']:
        validator = schemas[stem + '.schema.json']
        positive = read(f'fixtures/{stem}.valid.json')
        validator.validate(positive)
        negative = read(f'fixtures/{stem}.invalid.json')
        assert list(validator.iter_errors(negative)), f'{stem}: negative fixture passed'
        checked.extend([stem + ':valid-accepted', stem + ':invalid-rejected'])

    profile = read('fixtures/student-profile.valid.json')
    validator = schemas['student-profile.schema.json']
    altered = copy.deepcopy(profile)
    altered['observations'][0]['subjects']['MATH']['value'] = 0
    assert list(validator.iter_errors(altered)), 'absent score accepted as zero'
    altered = copy.deepcopy(profile)
    altered['whole_class_records'] = []
    assert list(validator.iter_errors(altered)), 'unexpected class payload accepted'

    matching = read('fixtures/match-result.valid.json')
    altered = copy.deepcopy(matching)
    altered['candidates'][0]['major_reference']['reference_rank_interval'] = [100, 200]
    assert list(schemas['match-result.schema.json'].iter_errors(altered)), 'unavailable reference carries computed rank'

    release = {
        'manifest_version': '1.0.0', 'release_id': 'synthetic-test-only',
        'created_at': '2026-09-09T12:00:00Z', 'schema_version': '1.0.0',
        'rules_version': 'nh-rules-1.0.0', 'status': 'PUBLISHED', 'synthetic': True,
        'files': [{'path': 'synthetic/offering.json', 'sha256': '0' * 64, 'size_bytes': 0}],
        'coverage': matching['coverage'], 'evidence_index_path': 'synthetic/evidence.json'
    }
    # In-memory structure example only; it is deliberately not a real release.
    schemas['data-release.schema.json'].validate(release)
    release['files'][0]['path'] = '../private.json'
    assert list(schemas['data-release.schema.json'].iter_errors(release)), 'relative traversal accepted'

    cases = read('fixtures/acceptance-cases.json')['cases']
    assert len(cases) == 52
    assert len({case['id'] for case in cases}) == len(cases)
    assert all(case['synthetic'] and case['input'] and case['expected'] and case['forbidden'] for case in cases)
    source_files = read('evidence/repository-files.json')
    assert source_files['file_count'] == len(source_files['files']) == 53
    assert len({(x['repo'], x['ref'], x['path']) for x in source_files['files']}) == 53
    assert all(len(x['blob_sha']) == 40 and len(x['ref']) == 40 for x in source_files['files'])
    sources = read('evidence/source-register.json')
    assert sources['published_admission_records'] == 0
    assert len(sources['sources']) == 7
    assert len({x['source_id'] for x in sources['sources']}) == 7
    retrievals = sources.get('retrieval_runs', [])
    assert retrievals, 'missing current retrieval run'
    latest_retrieval = retrievals[-1]
    retrieval_register = (ROOT / 'evidence' / latest_retrieval['register_path']).resolve()
    assert retrieval_register.is_file(), retrieval_register
    assert hashlib.sha256(retrieval_register.read_bytes()).hexdigest() == latest_retrieval['register_sha256']
    retrieval_data = json.loads(retrieval_register.read_text(encoding='utf-8'))
    assert retrieval_data['run_id'] == latest_retrieval['run_id']
    assert retrieval_data['representative_asset_count'] == latest_retrieval['representative_asset_count'] == 5
    assert latest_retrieval['human_verified_records'] == latest_retrieval['published_admission_records'] == 0

    for required in ['README.md', 'PRODUCT_SPEC.md', 'DATA_AND_MATCHING_SPEC.md',
                     'SYSTEM_AND_INTERFACE_SPEC.md', 'DELIVERY_AND_ACCEPTANCE.md',
                     'EVIDENCE_AND_REUSE.md']:
        assert (ROOT / required).is_file(), required
    print(json.dumps({
        'status': 'passed', 'schemas_valid': len(schemas),
        'positive_negative_fixtures': checked,
        'additional_structure_assertions': 6,
        'acceptance_cases_consistent': len(cases),
        'repository_file_references': 53, 'source_entries': 7,
        'source_retrieval_runs': len(retrievals),
        'application_tests_executed': False,
        'note': 'Only handoff contracts and internal consistency were checked; application tests must be run separately in nanhang-app.'
    }, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
