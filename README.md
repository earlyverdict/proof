# Early Verdict · Nov 3, 2026

`chain.jsonl`: every model round, House call and withdrawal, each entry hashed with the previous one. Calls, controls
and withdrawals are sealed during the night (`enc`: AES-256-GCM nonce, ciphertext and tag; `n`, `t` and `hash` in
clear). `key.sha256`: SHA-256 of the night key, committed before the first call. After the night: `key.txt`, the key,
and `plain.jsonl`, every entry in clear.
`head.txt`: the newest entry. `ots/`: OpenTimestamps stamps of each head. `snapshot-2300.json`: the House 95% range at 11:00 pm ET.

```
node verificar.mjs
ots verify ots/head-<n>.txt.ots
```
