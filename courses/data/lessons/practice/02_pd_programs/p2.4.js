/* ============================================================================
   PRACTICE P2.4 — Pandas Programs · 4
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p2.4",
 "lede": "**25 programs** from Pandas Programs. Read the title, write the program yourself, then open the worked version and what it printed when it was run.",
 "objectives": [
  "Write each program from its title before opening the worked version",
  "Predict the printed shapes and numbers before revealing the output",
  "Say which layer, loss or trick each program demonstrates and when you would reach for it",
  "Change one thing in each program — a shape, a hyperparameter — and predict what the output becomes"
 ],
 "prerequisites": [],
 "blocks": [
  {
   "t": "drill",
   "n": "76",
   "q": "URL Encoding",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from urllib.parse import quote, unquote, urlencode, parse_qs\n\nurl_part = \"hello world & special=chars?\"\nencoded = quote(url_part)\ndecoded = unquote(encoded)\nprint(f\"Encoded: {encoded}\")\nprint(f\"Decoded: {decoded}\")\n\n# Query string\nparams = {'q': 'python programming', 'page': '1', 'sort': 'date'}\nquery = urlencode(params)\nprint(f\"Query: {query}\")\nparsed = parse_qs(query)\nprint(f\"Parsed: {parsed}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "77",
   "q": "Hash Functions",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import hashlib\n\ntext = \"Hello, World!\"\nprint(f\"MD5: {hashlib.md5(text.encode()).hexdigest()}\")\nprint(f\"SHA-1: {hashlib.sha1(text.encode()).hexdigest()}\")\nprint(f\"SHA-256: {hashlib.sha256(text.encode()).hexdigest()}\")\nprint(f\"SHA-512: {hashlib.sha512(text.encode()).hexdigest()[:32]}...\")\n\n# File hash simulation\ndef hash_content(content, algorithm='sha256'):\n    h = hashlib.new(algorithm)\n    h.update(content.encode())\n    return h.hexdigest()\n\nprint(f\"Content hash: {hash_content('important data')}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "78",
   "q": "CRC32",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import binascii\n\ndata = b\"Hello, World!\"\ncrc = binascii.crc32(data)\nprint(f\"CRC32: {crc:#010x}\")  # Hex format\n\n# Verify integrity\ndata2 = b\"Hello, World!\"\ndata3 = b\"Hello, World?\"\nprint(f\"Same data CRC match: {binascii.crc32(data2) == crc}\")\nprint(f\"Diff data CRC match: {binascii.crc32(data3) == crc}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "79",
   "q": "Zlib Compression",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import zlib\n\noriginal = b\"Hello \" * 100\ncompressed = zlib.compress(original)\ndecompressed = zlib.decompress(compressed)\n\nprint(f\"Original: {len(original)} bytes\")\nprint(f\"Compressed: {len(compressed)} bytes\")\nprint(f\"Ratio: {len(compressed)/len(original):.1%}\")\nprint(f\"Match: {original == decompressed}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "80",
   "q": "Data Pipeline",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def pipeline(*functions):\n    def composite(data):\n        result = data\n        for fn in functions:\n            result = fn(result)\n        return result\n    return composite\n\nclean = pipeline(\n    str.strip,\n    str.lower,\n    lambda s: s.replace('  ', ' '),\n    lambda s: s.split()\n)\n\nraw = \"  Hello   World  This Is  A Test  \"\nprint(clean(raw))  # ['hello', 'world', 'this', 'is', 'a', 'test']"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "81",
   "q": "ETL Pipeline",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class ETLPipeline:\n    def __init__(self):\n        self.extractors = []\n        self.transformers = []\n        self.loaders = []\n    \n    def extract(self, fn):\n        self.extractors.append(fn)\n        return self\n    \n    def transform(self, fn):\n        self.transformers.append(fn)\n        return self\n    \n    def load(self, fn):\n        self.loaders.append(fn)\n        return self\n    \n    def run(self):\n        # Extract\n        data = []\n        for ext in self.extractors:\n            data.extend(ext())\n        \n        # Transform\n        for trans in self.transformers:\n            data = trans(data)\n        \n        # Load\n        for loader in self.loaders:\n            loader(data)\n        \n        return data\n\npipeline = ETLPipeline()\npipeline.extract(lambda: [{'name': 'Alice', 'score': 85}, {'name': 'Bob', 'score': 92}])\npipeline.transform(lambda data: [d | {'grade': 'A' if d['score'] >= 90 else 'B'} for d in data])\npipeline.load(lambda data: print(f\"Loaded {len(data)} records: {data}\"))\npipeline.run()\n# Output: Loaded 2 records: [{'name': 'Alice', 'score': 85, 'grade': 'B'}, ...]"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "82",
   "q": "Data Quality Checks",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class DataQualityChecker:\n    def __init__(self):\n        self.checks = []\n        self.results = []\n    \n    def add_check(self, name, check_fn, severity='error'):\n        self.checks.append({'name': name, 'fn': check_fn, 'severity': severity})\n    \n    def run(self, data):\n        self.results = []\n        for check in self.checks:\n            passed = check['fn'](data)\n            self.results.append({\n                'check': check['name'],\n                'passed': passed,\n                'severity': check['severity']\n            })\n        return self.results\n    \n    def summary(self):\n        passed = sum(1 for r in self.results if r['passed'])\n        total = len(self.results)\n        print(f\"Results: {passed}/{total} passed\")\n        for r in self.results:\n            status = '✓' if r['passed'] else '✗'\n            print(f\"  {status} [{r['severity']}] {r['check']}\")\n\nchecker = DataQualityChecker()\ndata = [{'age': 25}, {'age': -5}, {'age': 30}, {'age': None}]\n\nchecker.add_check('no_nulls', lambda d: all(r.get('age') is not None for r in d))\nchecker.add_check('positive_ages', lambda d: all(r['age'] > 0 for r in d if r['age'] is not None))\nchecker.add_check('min_records', lambda d: len(d) >= 3)\n\nchecker.run(data)\nchecker.summary()"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "83",
   "q": "Schema Validation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def validate_schema(data, schema):\n    errors = []\n    for field, rules in schema.items():\n        if rules.get('required') and field not in data:\n            errors.append(f\"Missing required field: {field}\")\n            continue\n        if field not in data:\n            continue\n        value = data[field]\n        if 'type' in rules and not isinstance(value, rules['type']):\n            errors.append(f\"{field}: expected {rules['type'].__name__}, got {type(value).__name__}\")\n        if 'min' in rules and value < rules['min']:\n            errors.append(f\"{field}: {value} below minimum {rules['min']}\")\n        if 'max' in rules and value > rules['max']:\n            errors.append(f\"{field}: {value} above maximum {rules['max']}\")\n        if 'pattern' in rules:\n            import re\n            if not re.match(rules['pattern'], str(value)):\n                errors.append(f\"{field}: doesn't match pattern {rules['pattern']}\")\n    return errors\n\nschema = {\n    'name': {'required': True, 'type': str},\n    'age': {'required': True, 'type': int, 'min': 0, 'max': 120},\n    'email': {'required': True, 'type': str, 'pattern': r'^[\\w.-]+@[\\w.-]+\\.\\w+$'}\n}\n\ndata = {'name': 'Alice', 'age': 25, 'email': 'alice@example.com'}\nprint(f\"Valid: {validate_schema(data, schema)}\")\n\ndata_bad = {'name': 123, 'age': -5, 'email': 'not-an-email'}\nprint(f\"Invalid: {validate_schema(data_bad, schema)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "84",
   "q": "Data Deduplication",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def deduplicate(records, key_fields, strategy='first'):\n    seen = {}\n    for record in records:\n        key = tuple(record.get(f) for f in key_fields)\n        if key not in seen:\n            seen[key] = record\n        elif strategy == 'last':\n            seen[key] = record\n        elif strategy == 'merge':\n            for k, v in record.items():\n                if v is not None:\n                    seen[key][k] = v\n    return list(seen.values())\n\nrecords = [\n    {'id': 1, 'name': 'Alice', 'score': 85},\n    {'id': 1, 'name': 'Alice', 'score': 90},\n    {'id': 2, 'name': 'Bob', 'score': 75},\n    {'id': 2, 'name': 'Bob', 'score': None}\n]\n\nprint(f\"First: {deduplicate(records, ['id'], 'first')}\")\nprint(f\"Last: {deduplicate(records, ['id'], 'last')}\")\nprint(f\"Merge: {deduplicate(records, ['id'], 'merge')}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "85",
   "q": "Data Masking",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import hashlib\nimport re\n\ndef mask_email(email):\n    parts = email.split('@')\n    name = parts[0]\n    masked_name = name[0] + '*' * (len(name) - 2) + name[-1]\n    return f\"{masked_name}@{parts[1]}\"\n\ndef mask_phone(phone):\n    digits = re.sub(r'\\D', '', phone)\n    return f\"***-***-{digits[-4:]}\"\n\ndef mask_ssn(ssn):\n    return f\"***-**-{ssn[-4:]}\"\n\ndef hash_pii(value, salt='secret'):\n    return hashlib.sha256(f\"{salt}{value}\".encode()).hexdigest()[:16]\n\nprint(mask_email(\"alice.smith@example.com\"))  # a*********h@example.com\nprint(mask_phone(\"555-123-4567\"))             # ***-***-4567\nprint(mask_ssn(\"123-45-6789\"))                # ***-**-6789\nprint(hash_pii(\"alice@example.com\"))          # 16-char hash"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "86",
   "q": "Sliding Window Aggregation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def sliding_window_agg(data, window_size, agg_fn):\n    results = []\n    for i in range(len(data) - window_size + 1):\n        window = data[i:i + window_size]\n        results.append(agg_fn(window))\n    return results\n\nimport numpy as np\ndata = list(np.random.randn(20))\nprint(f\"Moving mean: {[f'{x:.2f}' for x in sliding_window_agg(data, 5, np.mean)]}\")\nprint(f\"Moving max: {[f'{x:.2f}' for x in sliding_window_agg(data, 5, max)]}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "87",
   "q": "Data Partitioning",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def partition_data(data, partition_fn):\n    partitions = {}\n    for item in data:\n        key = partition_fn(item)\n        if key not in partitions:\n            partitions[key] = []\n        partitions[key].append(item)\n    return partitions\n\nusers = [\n    {'name': 'Alice', 'age': 25}, {'name': 'Bob', 'age': 35},\n    {'name': 'Charlie', 'age': 22}, {'name': 'Diana', 'age': 45},\n    {'name': 'Eve', 'age': 31}\n]\n\nby_age_group = partition_data(users, lambda u: 'young' if u['age'] < 30 else 'senior')\nfor group, members in by_age_group.items():\n    print(f\"{group}: {[m['name'] for m in members]}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "88",
   "q": "Change Data Capture",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def detect_changes(old_records, new_records, key_field):\n    old_map = {r[key_field]: r for r in old_records}\n    new_map = {r[key_field]: r for r in new_records}\n    \n    inserts = [r for k, r in new_map.items() if k not in old_map]\n    deletes = [r for k, r in old_map.items() if k not in new_map]\n    updates = [new_map[k] for k in set(old_map) & set(new_map) if old_map[k] != new_map[k]]\n    unchanged = [new_map[k] for k in set(old_map) & set(new_map) if old_map[k] == new_map[k]]\n    \n    return {'inserts': inserts, 'deletes': deletes, 'updates': updates, 'unchanged': unchanged}\n\nold = [{'id': 1, 'v': 'a'}, {'id': 2, 'v': 'b'}, {'id': 3, 'v': 'c'}]\nnew = [{'id': 1, 'v': 'a'}, {'id': 2, 'v': 'B'}, {'id': 4, 'v': 'd'}]\nchanges = detect_changes(old, new, 'id')\nfor op, records in changes.items():\n    print(f\"{op}: {records}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "89",
   "q": "Data Lineage Tracker",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class DataLineage:\n    def __init__(self):\n        self.history = []\n    \n    def track(self, operation, details=None):\n        import time\n        self.history.append({\n            'timestamp': time.time(),\n            'operation': operation,\n            'details': details\n        })\n    \n    def show(self):\n        for i, entry in enumerate(self.history):\n            print(f\"{i+1}. {entry['operation']}: {entry['details']}\")\n\nlineage = DataLineage()\nlineage.track('extract', 'Read 1000 rows from source')\nlineage.track('filter', 'Removed 50 null rows')\nlineage.track('transform', 'Applied normalization to 5 columns')\nlineage.track('aggregate', 'Grouped by category, computed means')\nlineage.track('load', 'Wrote 20 rows to output')\nlineage.show()"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "90",
   "q": "Rate Limiter for API Calls",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import time\nfrom collections import deque\n\nclass RateLimiter:\n    def __init__(self, max_calls, period):\n        self.max_calls = max_calls\n        self.period = period\n        self.calls = deque()\n    \n    def acquire(self):\n        now = time.time()\n        while self.calls and self.calls[0] < now - self.period:\n            self.calls.popleft()\n        if len(self.calls) < self.max_calls:\n            self.calls.append(now)\n            return True\n        return False\n    \n    def wait_time(self):\n        if len(self.calls) < self.max_calls:\n            return 0\n        return self.calls[0] + self.period - time.time()\n\nlimiter = RateLimiter(max_calls=3, period=1.0)\nfor i in range(5):\n    if limiter.acquire():\n        print(f\"Request {i+1}: allowed\")\n    else:\n        print(f\"Request {i+1}: rate limited (wait {limiter.wait_time():.2f}s)\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "91",
   "q": "Checksum Validator",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def calculate_checksum(data, method='xor'):\n    if method == 'xor':\n        result = 0\n        for byte in data.encode():\n            result ^= byte\n        return result\n    elif method == 'sum':\n        return sum(data.encode()) % 256\n\ndata = \"Important data packet\"\nxor_check = calculate_checksum(data, 'xor')\nsum_check = calculate_checksum(data, 'sum')\nprint(f\"XOR checksum: {xor_check:#04x}\")\nprint(f\"Sum checksum: {sum_check:#04x}\")\n\n# Verify\nprint(f\"XOR valid: {calculate_checksum(data, 'xor') == xor_check}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "92",
   "q": "Data Sampling Strategies",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndef systematic_sample(data, k):\n    start = np.random.randint(0, k)\n    return [data[i] for i in range(start, len(data), k)]\n\ndef reservoir_sample(stream, k):\n    reservoir = []\n    for i, item in enumerate(stream):\n        if i < k:\n            reservoir.append(item)\n        else:\n            j = np.random.randint(0, i + 1)\n            if j < k:\n                reservoir[j] = item\n    return reservoir\n\ndata = list(range(100))\nprint(f\"Systematic (every 10th): {systematic_sample(data, 10)}\")\nprint(f\"Reservoir (10 items): {sorted(reservoir_sample(data, 10))}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "93",
   "q": "Tokenizer",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import re\n\ndef tokenize(text, pattern=r'\\w+'):\n    return re.findall(pattern, text.lower())\n\ndef build_vocab(texts, min_freq=1):\n    from collections import Counter\n    all_tokens = []\n    for text in texts:\n        all_tokens.extend(tokenize(text))\n    freq = Counter(all_tokens)\n    vocab = {token: idx for idx, (token, count) in enumerate(freq.most_common()) if count >= min_freq}\n    return vocab\n\ndef encode_text(text, vocab, unk_idx=-1):\n    return [vocab.get(token, unk_idx) for token in tokenize(text)]\n\ntexts = [\"Hello world\", \"Hello Python world\", \"Python is great\"]\nvocab = build_vocab(texts)\nprint(f\"Vocab: {vocab}\")\nprint(f\"Encoded: {encode_text('Hello Python', vocab)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "94",
   "q": "N-gram Generator",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def ngrams(text, n=2):\n    words = text.lower().split()\n    return [tuple(words[i:i+n]) for i in range(len(words)-n+1)]\n\ndef char_ngrams(text, n=3):\n    return [text[i:i+n] for i in range(len(text)-n+1)]\n\ntext = \"The quick brown fox jumps over the lazy dog\"\nprint(f\"Bigrams: {ngrams(text, 2)[:5]}\")\nprint(f\"Trigrams: {ngrams(text, 3)[:5]}\")\nprint(f\"Char 3-grams: {char_ngrams('hello', 3)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "95",
   "q": "TF-IDF (Simple)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import math\nfrom collections import Counter\n\ndef compute_tf(doc):\n    words = doc.lower().split()\n    freq = Counter(words)\n    total = len(words)\n    return {word: count/total for word, count in freq.items()}\n\ndef compute_idf(docs):\n    n = len(docs)\n    doc_freq = Counter()\n    for doc in docs:\n        words = set(doc.lower().split())\n        doc_freq.update(words)\n    return {word: math.log(n / (count + 1)) + 1 for word, count in doc_freq.items()}\n\ndef compute_tfidf(docs):\n    idf = compute_idf(docs)\n    tfidf_docs = []\n    for doc in docs:\n        tf = compute_tf(doc)\n        tfidf = {word: tf_val * idf.get(word, 0) for word, tf_val in tf.items()}\n        tfidf_docs.append(tfidf)\n    return tfidf_docs\n\ndocs = [\"the cat sat on the mat\", \"the dog ran in the park\", \"the cat ran fast\"]\ntfidf = compute_tfidf(docs)\nfor i, doc_tfidf in enumerate(tfidf):\n    top = sorted(doc_tfidf.items(), key=lambda x: -x[1])[:3]\n    print(f\"Doc {i}: {top}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "96",
   "q": "Batch Processing",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def batch_process(data, batch_size, process_fn):\n    results = []\n    for i in range(0, len(data), batch_size):\n        batch = data[i:i + batch_size]\n        result = process_fn(batch)\n        results.extend(result)\n        print(f\"Processed batch {i//batch_size + 1}: {len(batch)} items\")\n    return results\n\ndata = list(range(25))\nprocessed = batch_process(data, batch_size=10, process_fn=lambda batch: [x**2 for x in batch])\nprint(f\"Results: {processed}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "97",
   "q": "Data Diff",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def diff_dicts(old, new):\n    added = {k: new[k] for k in set(new) - set(old)}\n    removed = {k: old[k] for k in set(old) - set(new)}\n    modified = {k: {'old': old[k], 'new': new[k]} for k in set(old) & set(new) if old[k] != new[k]}\n    return {'added': added, 'removed': removed, 'modified': modified}\n\nold = {'name': 'Alice', 'age': 30, 'city': 'NYC'}\nnew = {'name': 'Alice', 'age': 31, 'country': 'US'}\n\ndiff = diff_dicts(old, new)\nfor change_type, changes in diff.items():\n    print(f\"{change_type}: {changes}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "98",
   "q": "Retry with Backoff",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import time\nimport random\n\ndef retry_with_backoff(fn, max_retries=3, base_delay=1.0, max_delay=30.0):\n    for attempt in range(max_retries + 1):\n        try:\n            return fn()\n        except Exception as e:\n            if attempt == max_retries:\n                raise\n            delay = min(base_delay * (2 ** attempt) + random.uniform(0, 1), max_delay)\n            print(f\"Attempt {attempt + 1} failed: {e}. Retrying in {delay:.1f}s...\")\n\n# Demo\ncounter = {'value': 0}\ndef flaky_function():\n    counter['value'] += 1\n    if counter['value'] < 3:\n        raise ConnectionError(f\"Failed (attempt {counter['value']})\")\n    return \"Success!\"\n\nresult = retry_with_backoff(flaky_function)\nprint(f\"Result: {result}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "99",
   "q": "Data Summary Report",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def generate_report(data, title=\"Data Summary\"):\n    import numpy as np\n    \n    print(f\"\\n{'=' * 50}\")\n    print(f\" {title}\")\n    print(f\"{'=' * 50}\")\n    print(f\" Records: {len(data)}\")\n    \n    if isinstance(data[0], dict):\n        fields = data[0].keys()\n        for field in fields:\n            values = [d[field] for d in data if field in d and d[field] is not None]\n            if values and isinstance(values[0], (int, float)):\n                arr = np.array(values)\n                print(f\"\\n {field}:\")\n                print(f\"   Count: {len(arr)}, Mean: {arr.mean():.2f}, Std: {arr.std():.2f}\")\n                print(f\"   Min: {arr.min():.2f}, Max: {arr.max():.2f}\")\n            elif values and isinstance(values[0], str):\n                from collections import Counter\n                top = Counter(values).most_common(3)\n                print(f\"\\n {field}:\")\n                print(f\"   Unique: {len(set(values))}, Top: {top}\")\n    print(f\"{'=' * 50}\")\n\ndata = [\n    {'name': 'Alice', 'age': 30, 'dept': 'Eng'},\n    {'name': 'Bob', 'age': 25, 'dept': 'Mkt'},\n    {'name': 'Charlie', 'age': 35, 'dept': 'Eng'},\n    {'name': 'Diana', 'age': 28, 'dept': 'DS'}\n]\ngenerate_report(data, \"Employee Summary\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "100",
   "q": "Complete Data Pipeline Class",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "class DataPipeline:\n    def __init__(self, name=\"pipeline\"):\n        self.name = name\n        self.steps = []\n        self.data = None\n        self.log = []\n    \n    def add_step(self, name, fn):\n        self.steps.append({'name': name, 'fn': fn})\n        return self\n    \n    def run(self, data):\n        self.data = data\n        self.log = []\n        \n        for step in self.steps:\n            before_count = len(self.data) if isinstance(self.data, list) else 'N/A'\n            self.data = step['fn'](self.data)\n            after_count = len(self.data) if isinstance(self.data, list) else 'N/A'\n            self.log.append(f\"{step['name']}: {before_count} → {after_count}\")\n        \n        return self.data\n    \n    def show_log(self):\n        print(f\"Pipeline: {self.name}\")\n        for entry in self.log:\n            print(f\"  → {entry}\")\n\n# Usage\nimport numpy as np\n\npipeline = DataPipeline(\"sales_etl\")\npipeline.add_step(\"filter_positive\", lambda data: [d for d in data if d['amount'] > 0])\npipeline.add_step(\"add_tax\", lambda data: [{**d, 'total': d['amount'] * 1.1} for d in data])\npipeline.add_step(\"sort\", lambda data: sorted(data, key=lambda d: -d['total']))\n\nsales = [\n    {'id': 1, 'amount': 100}, {'id': 2, 'amount': -50},\n    {'id': 3, 'amount': 200}, {'id': 4, 'amount': 0},\n    {'id': 5, 'amount': 150}\n]\n\nresult = pipeline.run(sales)\npipeline.show_log()\nfor item in result:\n    print(f\"  {item}\")"
    }
   ],
   "kind": "program"
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
