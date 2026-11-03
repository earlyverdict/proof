# Early Verdict · Nov 3, 2026

`chain.jsonl`: every model round, House call and withdrawal, each entry hashed with the previous one.
`head.txt`: the newest entry. `ots/`: OpenTimestamps stamps of each head. `snapshot-2300.json`: the House 95% range at 11:00 pm ET.

```
node verificar.mjs
ots verify ots/head-<n>.txt.ots
```
