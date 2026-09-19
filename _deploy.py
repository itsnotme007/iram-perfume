import urllib.request, re, html

url = 'https://itsnotme007.github.io/iram-perfume/'
d = urllib.request.urlopen(url, timeout=15).read().decode('utf-8', errors='replace')
# Split into rows by <tr>, then find rows containing Hawas
rows = re.split(r'<tr', d)
for r in rows:
    if 'Hawas Ice' in r or 'Hawas Fire' in r or 'Hawas Black' in r or 'Hawas OG' in r:
        cells = re.findall(r'<td class="size-cell"[^>]*>(.*?)</td>', r, re.S)
        prices = []
        for c in cells:
            nums = re.sub(r'<[^>]+>', '', c).strip()
            prices.append(nums)
        frag = re.search(r'Hawas [A-Za-z ]+', r)
        print(frag.group(0) if frag else '?', '->', prices[:5])
        print()
