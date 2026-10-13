"""SearchLight-specific installed asset evidence; static reads only, no game launch.
Run bundled Python 3.12 with -I -B; existing cp312 UnityPy dependencies are read-only.
"""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path('../.tools/unity-analysis').resolve()))
import UnityPy
from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator
from UnityPy.helpers.TypeTreeNode import TypeTreeNode
GAME = pathlib.Path('D:/SteamLibrary/steamapps/common/PICO PARK 2')
DATA = GAME / 'pico_park_2_Data'
generator = TypeTreeGenerator('2022.3.5f1')
generator.load_local_game(str(GAME))
env = UnityPy.load(str(DATA/'resources.assets'), str(DATA/'globalgamemanagers.assets'))
objects = {o.path_id:o for o in env.objects if pathlib.Path(o.assets_file.name).name == 'resources.assets'}
def tree(path_id, class_name):
    nodes = generator.get_nodes('PhotonQuantum', class_name)
    for node in nodes:
        if node.m_Name == 'm_Enabled': node.m_MetaFlag |= 16384
    root = TypeTreeNode.from_list([TypeTreeNode(n.m_Level,n.m_Type,n.m_Name,0,0,m_MetaFlag=n.m_MetaFlag) for n in nodes])
    return objects[path_id].read_typetree(nodes=root)
result = {
    'method':'Static UnityPy/TypeTreeGenerator reads; original game never executed',
    'asset': 'resources.assets',
    'searchLightEntityPrototypeAsset': tree(6310, 'EntityPrototypeAsset'),
    'searchLightEntityPrototype': tree(8037, 'EntityPrototype'),
    'searchLightGameObject': objects[1276].read_typetree(),
    'searchLightTransform': objects[3411].read_typetree(),
    'interpretation':'Prefab contains EntityPrototype, EntityView, SearchLightView; no serialized EntityComponentSearchLightComponent and no children. Materialize asset+0x78 is not established as the shipped creation path. Follow Creator 0x1816f06f0 -> generic component helper 0x1802010a0 -> default value factory 0x1806845a0 before assigning defaults.'
}
print(json.dumps(result, ensure_ascii=False, indent=2))

