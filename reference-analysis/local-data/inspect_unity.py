"""Read-only inspection of installed Unity serialized objects. No media export."""
import argparse
import collections
import hashlib
import json
import pathlib
import sys

WORKSPACE = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(WORKSPACE / '.tools' / 'unity-analysis'))
import UnityPy

GAME = pathlib.Path('D:/SteamLibrary/steamapps/common/PICO PARK 2/pico_park_2_Data')
OUT = pathlib.Path(__file__).resolve().parent
GENERATOR = None
INTEREST = {'GameObject', 'Transform', 'RectTransform', 'MonoBehaviour', 'MonoScript',
            'Rigidbody2D', 'BoxCollider2D', 'CircleCollider2D', 'CapsuleCollider2D',
            'PolygonCollider2D', 'PhysicsManager', 'Physics2DSettings', 'BuildSettings'}

def inspect(path):
    result = {'file': path.name, 'bytes': path.stat().st_size,
              'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'type_counts': {}, 'objects': [], 'errors': []}
    try:
        env = UnityPy.load(str(path))
        if GENERATOR is not None:
            env.typetree_generator = GENERATOR
        counts = collections.Counter(o.type.name for o in env.objects)
        result['type_counts'] = dict(counts)
        for obj in env.objects:
            if obj.type.name not in INTEREST:
                continue
            row = {'path_id': obj.path_id, 'type': obj.type.name}
            try:
                row['fields'] = obj.read_typetree()
            except Exception as error:
                row['typetree_error'] = str(error)[:350]
                try:
                    # Unity strips many game-script field layouts. Keep only the known header,
                    # explicitly marked partial; never label unidentified trailing bytes as constants.
                    row['partial_fields_only'] = obj.read_typetree(check_read=False)
                    data = obj.read(check_read=False)
                    for name in ['m_Name', 'm_ClassName', 'm_Namespace', 'm_AssemblyName']:
                        if hasattr(data, name):
                            row[name] = getattr(data, name)
                    if hasattr(data, 'm_Script'):
                        row['script_pointer'] = {'file_id': data.m_Script.m_FileID, 'path_id': data.m_Script.m_PathID}
                except Exception as inner:
                    row['read_error'] = str(inner)[:350]
            result['objects'].append(row)
    except Exception as error:
        result['errors'].append(str(error)[:600])
    return result

def main():
    global GENERATOR
    parser = argparse.ArgumentParser()
    parser.add_argument('files', nargs='*')
    parser.add_argument('--types', action='store_true', help='Read IL2CPP field metadata; does not run the game DLL')
    args = parser.parse_args()
    if args.types:
        from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator
        GENERATOR = TypeTreeGenerator('2022.3.28f1')
        GENERATOR.load_local_game(str(GAME.parent))
    files = args.files or ['resources.assets', 'globalgamemanagers', 'globalgamemanagers.assets'] + [f'level{i}' for i in range(14)] + [f'sharedassets{i}.assets' for i in range(14)]
    summaries = []
    for filename in files:
        result = inspect(GAME / filename)
        output = OUT / (filename.replace('.', '_') + ('_typed' if args.types else '') + '.json')
        output.write_text(json.dumps(result, ensure_ascii=False, indent=2, default=str), encoding='utf-8')
        summary = {key: result[key] for key in ['file', 'bytes', 'type_counts', 'errors']}
        summary['typetree_failures'] = sum('typetree_error' in row for row in result['objects'])
        summaries.append(summary)
        print(json.dumps(summary, ensure_ascii=False), flush=True)
    (OUT / ('inventory_typed.json' if args.types else 'inventory.json')).write_text(json.dumps(summaries, ensure_ascii=False, indent=2), encoding='utf-8')

if __name__ == '__main__':
    main()
