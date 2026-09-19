import re, json

def parse_list(src):
    # price-list.js defines PRICE_LIST = [ {...}, ... ]
    m = re.search(r'=\s*(\[.*\])\s*;?\s*$', src, re.S)
    if not m:
        return None
    arr = json.loads(m.group(1).replace("'", '"'))
    return arr

for label, path in [('CURRENT', r'C:\Users\Fateh\Downloads\models\orders-app\price-list.js'),
                    ('BACKUP', r'C:\Users\Fateh\AppData\Local\Temp\opencode\mod-backups\20260808-151034\price-list.js')]:
    src = open(path, encoding='utf-8').read()
    arr = parse_list(src)
    if arr is None:
        print(label, 'PARSE FAIL')
        continue
    for i, p in enumerate(arr):
        if 'Hawas' in str(p.get('name','')):
            print(label, 'idx', i, 'name=', p.get('name'), 'sell30=', p.get('sell30'))
    print()
