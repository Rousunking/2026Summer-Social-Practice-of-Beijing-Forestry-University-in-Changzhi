import re

with open(r'c:\Users\yuxia\Downloads\云上党地图\云上党地图\data.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'("town":\s*"韩店街道"[^\}]*?"lng":\s*)113\.0483(,\s*"lat":\s*)36\.0501',
    r'\g<1>113.0516\g<2>36.0495',
    content
)

with open(r'c:\Users\yuxia\Downloads\云上党地图\云上党地图\data.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
