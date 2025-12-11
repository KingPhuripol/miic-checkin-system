import json
from collections import Counter

with open('participants.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

titles = Counter(p.get('title', '').strip() for p in data)
statuses = Counter(p.get('status', '').strip() for p in data)
orgs = Counter(p.get('org', '').strip() for p in data)

print("--- Titles ---")
for t, c in titles.most_common():
    print(f"{t}: {c}")

print("\n--- Statuses ---")
for s, c in statuses.most_common():
    print(f"{s}: {c}")

print("\n--- Organizations (Top 20) ---")
for o, c in orgs.most_common(20):
    print(f"{o}: {c}")
