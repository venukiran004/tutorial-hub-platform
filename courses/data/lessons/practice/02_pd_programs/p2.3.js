/* ============================================================================
   PRACTICE P2.3 — Pandas Programs · 3
   ----------------------------------------------------------------------------
   ========================================================================= */
EC.receiveLesson({
 "id": "p2.3",
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
   "n": "51",
   "q": "Matplotlib Basic Plot Structure",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nx = np.linspace(0, 10, 100)\nfunctions = {\n    'sin': np.sin(x),\n    'cos': np.cos(x),\n    'tan_clip': np.clip(np.tan(x), -5, 5)\n}\nfor name, y in functions.items():\n    print(f\"{name}: min={y.min():.2f}, max={y.max():.2f}, mean={y.mean():.2f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "52",
   "q": "Histogram Data",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ndata = np.random.randn(10000)\ncounts, edges = np.histogram(data, bins=50)\nprint(f\"Peak bin: [{edges[counts.argmax()]:.2f}, {edges[counts.argmax()+1]:.2f}]\")\nprint(f\"Peak count: {counts.max()}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "53",
   "q": "Scatter Plot Data Generation",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nnp.random.seed(42)\nn = 200\nx = np.random.randn(n)\ny = 2 * x + np.random.randn(n) * 0.5\ncorrelation = np.corrcoef(x, y)[0, 1]\nprint(f\"Generated scatter data: n={n}, corr={correlation:.4f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "54",
   "q": "Bar Chart Data",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ncategories = ['Python', 'JavaScript', 'Java', 'C++', 'Go']\nvalues = [85, 75, 60, 50, 45]\nsorted_idx = np.argsort(values)[::-1]\nfor i in sorted_idx:\n    bar = '█' * (values[i] // 5)\n    print(f\"{categories[i]:12s} {bar} {values[i]}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "55",
   "q": "Heatmap Data",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nnp.random.seed(42)\ncorr_matrix = np.corrcoef(np.random.randn(5, 100))\nfeatures = ['Feature_A', 'Feature_B', 'Feature_C', 'Feature_D', 'Feature_E']\nprint(\"Correlation Matrix:\")\nprint(f\"{'':12s}\", end='')\nfor f in features:\n    print(f\"{f:>12s}\", end='')\nprint()\nfor i, f in enumerate(features):\n    print(f\"{f:12s}\", end='')\n    for j in range(len(features)):\n        print(f\"{corr_matrix[i,j]:12.3f}\", end='')\n    print()"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "56",
   "q": "Box Plot Statistics",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\ngroups = {'A': np.random.randn(100), 'B': np.random.randn(100) + 1, 'C': np.random.randn(100) * 2}\nfor name, data in groups.items():\n    q1, median, q3 = np.percentile(data, [25, 50, 75])\n    iqr = q3 - q1\n    print(f\"Group {name}: Q1={q1:.2f}, Median={median:.2f}, Q3={q3:.2f}, IQR={iqr:.2f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "57",
   "q": "Pie Chart Data",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "categories = {'Engineering': 35, 'Marketing': 20, 'Sales': 25, 'HR': 10, 'Other': 10}\ntotal = sum(categories.values())\nfor cat, val in sorted(categories.items(), key=lambda x: -x[1]):\n    pct = val / total * 100\n    bar = '▓' * int(pct / 2)\n    print(f\"{cat:15s} {bar} {pct:.0f}%\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "58",
   "q": "Time Series Decomposition (manual)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nt = np.arange(365)\ntrend = 0.1 * t\nseasonal = 10 * np.sin(2 * np.pi * t / 365)\nnoise = np.random.randn(365) * 2\nsignal = trend + seasonal + noise\n\n# Extract trend (moving average)\nwindow = 30\ntrend_est = np.convolve(signal, np.ones(window)/window, mode='valid')\nprint(f\"Original length: {len(signal)}, Trend length: {len(trend_est)}\")\nprint(f\"Trend start: {trend_est[0]:.2f}, end: {trend_est[-1]:.2f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "59",
   "q": "Distribution Comparison",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nnormal = np.random.normal(0, 1, 10000)\nuniform = np.random.uniform(-2, 2, 10000)\nexponential = np.random.exponential(1, 10000)\n\nfor name, data in [('Normal', normal), ('Uniform', uniform), ('Exponential', exponential)]:\n    print(f\"{name:12s}: mean={data.mean():.3f}, std={data.std():.3f}, \"\n          f\"skew={float(np.mean(((data-data.mean())/data.std())**3)):.3f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "60",
   "q": "Correlation Network Data",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import numpy as np\n\nnp.random.seed(42)\nn_vars = 6\ndata = np.random.randn(100, n_vars)\ndata[:, 1] = data[:, 0] * 0.8 + np.random.randn(100) * 0.3\ndata[:, 3] = data[:, 2] * -0.7 + np.random.randn(100) * 0.4\ncorr = np.corrcoef(data.T)\n\nprint(\"Strong correlations (|r| > 0.5):\")\nfor i in range(n_vars):\n    for j in range(i+1, n_vars):\n        if abs(corr[i,j]) > 0.5:\n            print(f\"  Var{i} <-> Var{j}: r={corr[i,j]:.3f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "61",
   "q": "CSV Read/Write",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import csv\nimport io\n\n# Write CSV\noutput = io.StringIO()\nwriter = csv.DictWriter(output, fieldnames=['name', 'age', 'city'])\nwriter.writeheader()\nwriter.writerows([\n    {'name': 'Alice', 'age': 30, 'city': 'NYC'},\n    {'name': 'Bob', 'age': 25, 'city': 'LA'}\n])\ncsv_content = output.getvalue()\nprint(csv_content)\n\n# Read CSV\nreader = csv.DictReader(io.StringIO(csv_content))\nfor row in reader:\n    print(dict(row))"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "62",
   "q": "JSON Processing",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import json\n\ndata = {\n    'users': [\n        {'name': 'Alice', 'skills': ['Python', 'ML'], 'active': True},\n        {'name': 'Bob', 'skills': ['Java', 'AWS'], 'active': False}\n    ]\n}\n\njson_str = json.dumps(data, indent=2)\nprint(json_str)\n\n# Parse back\nparsed = json.loads(json_str)\nactive = [u['name'] for u in parsed['users'] if u['active']]\nprint(f\"Active users: {active}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "63",
   "q": "YAML-like Config Parser",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def parse_simple_config(text):\n    config = {}\n    current_section = None\n    for line in text.strip().split('\\n'):\n        line = line.rstrip()\n        if not line or line.startswith('#'):\n            continue\n        if line.endswith(':') and not '=' in line:\n            current_section = line[:-1].strip()\n            config[current_section] = {}\n        elif '=' in line:\n            key, value = line.split('=', 1)\n            key, value = key.strip(), value.strip()\n            if current_section:\n                config[current_section][key] = value\n            else:\n                config[key] = value\n    return config\n\nconfig_text = \"\"\"\n# Database config\ndatabase:\n  host = localhost\n  port = 5432\n  name = mydb\n\napp:\n  debug = true\n  workers = 4\n\"\"\"\nprint(parse_simple_config(config_text))"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "64",
   "q": "Log File Parser",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import re\nfrom collections import Counter\n\nlog_data = \"\"\"\n2024-01-15 10:30:22 ERROR Database connection failed\n2024-01-15 10:30:25 WARNING Retry attempt 1\n2024-01-15 10:30:28 INFO Connection restored\n2024-01-15 10:31:00 ERROR Timeout on query\n2024-01-15 10:31:05 INFO Query retried successfully\n2024-01-15 10:32:00 WARNING Memory usage high\n\"\"\"\n\npattern = r'(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}) (\\w+) (.+)'\nentries = re.findall(pattern, log_data)\n\nlevel_counts = Counter(level for _, level, _ in entries)\nprint(f\"Log levels: {dict(level_counts)}\")\n\nerrors = [(ts, msg) for ts, level, msg in entries if level == 'ERROR']\nprint(f\"Errors: {errors}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "65",
   "q": "Binary File Operations",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import struct\n\n# Pack structured data\nformat_str = 'if10s'  # int, float, 10-char string\ndata = struct.pack(format_str, 42, 3.14, b'Hello     ')\nprint(f\"Packed size: {len(data)} bytes\")\n\n# Unpack\nunpacked = struct.unpack(format_str, data)\nprint(f\"Unpacked: int={unpacked[0]}, float={unpacked[1]:.2f}, str={unpacked[2].strip()}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "66",
   "q": "INI-style Config",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from configparser import ConfigParser\nimport io\n\nconfig_str = \"\"\"\n[database]\nhost = localhost\nport = 5432\nname = app_db\n\n[cache]\nbackend = redis\nttl = 3600\n\"\"\"\n\nconfig = ConfigParser()\nconfig.read_string(config_str)\n\nfor section in config.sections():\n    print(f\"[{section}]\")\n    for key, value in config.items(section):\n        print(f\"  {key} = {value}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "67",
   "q": "XML-like Parser (Simple)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import re\n\nxml_data = \"\"\"<users>\n  <user id=\"1\"><name>Alice</name><age>30</age></user>\n  <user id=\"2\"><name>Bob</name><age>25</age></user>\n</users>\"\"\"\n\nusers = re.findall(r'<user id=\"(\\d+)\"><name>(.+?)</name><age>(\\d+)</age></user>', xml_data)\nfor uid, name, age in users:\n    print(f\"ID: {uid}, Name: {name}, Age: {age}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "68",
   "q": "Data Serialization Comparison",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import json\nimport pickle\nimport sys\n\ndata = {'key': list(range(1000)), 'nested': {'a': [1.5] * 100}}\n\njson_size = sys.getsizeof(json.dumps(data))\npickle_size = sys.getsizeof(pickle.dumps(data))\n\nprint(f\"JSON size: {json_size:,} bytes\")\nprint(f\"Pickle size: {pickle_size:,} bytes\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "69",
   "q": "Text File Statistics",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "text = \"\"\"The quick brown fox jumps over the lazy dog.\nPython is a great programming language.\nData science combines statistics and programming.\nMachine learning automates analytical model building.\"\"\"\n\nlines = text.strip().split('\\n')\nwords = text.split()\nchars = len(text)\nunique_words = len(set(w.lower().strip('.,') for w in words))\n\nprint(f\"Lines: {len(lines)}\")\nprint(f\"Words: {len(words)}\")\nprint(f\"Unique words: {unique_words}\")\nprint(f\"Characters: {chars}\")\nprint(f\"Avg words/line: {len(words)/len(lines):.1f}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "70",
   "q": "Environment Variable Parser",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import os\n\ndef parse_env_string(env_str):\n    \"\"\"Parse .env file format\"\"\"\n    env = {}\n    for line in env_str.strip().split('\\n'):\n        line = line.strip()\n        if not line or line.startswith('#'):\n            continue\n        if '=' in line:\n            key, value = line.split('=', 1)\n            value = value.strip().strip('\"').strip(\"'\")\n            env[key.strip()] = value\n    return env\n\nenv_content = \"\"\"\n# Application settings\nAPP_NAME=MyApp\nAPP_PORT=8080\nDB_URL=\"postgresql://localhost:5432/mydb\"\nSECRET_KEY='super-secret-key'\nDEBUG=true\n\"\"\"\n\nenv = parse_env_string(env_content)\nfor k, v in env.items():\n    print(f\"{k}: {v}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "71",
   "q": "Run-Length Encoding",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def rle_encode(data):\n    if not data:\n        return []\n    encoded = []\n    count = 1\n    for i in range(1, len(data)):\n        if data[i] == data[i-1]:\n            count += 1\n        else:\n            encoded.append((data[i-1], count))\n            count = 1\n    encoded.append((data[-1], count))\n    return encoded\n\ndef rle_decode(encoded):\n    return ''.join(char * count for char, count in encoded)\n\ntext = \"AAABBBCCDDDDDEEF\"\nencoded = rle_encode(text)\nprint(f\"Encoded: {encoded}\")  # [('A',3),('B',3),('C',2),('D',5),('E',2),('F',1)]\nprint(f\"Decoded: {rle_decode(encoded)}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "72",
   "q": "Base64 Encoding",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "import base64\n\noriginal = \"Hello, World! 🌍\"\nencoded = base64.b64encode(original.encode()).decode()\ndecoded = base64.b64decode(encoded).decode()\nprint(f\"Original: {original}\")\nprint(f\"Encoded: {encoded}\")\nprint(f\"Decoded: {decoded}\")\n\n# URL-safe base64\nurl_safe = base64.urlsafe_b64encode(original.encode()).decode()\nprint(f\"URL-safe: {url_safe}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "73",
   "q": "Huffman Coding",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "from collections import Counter\nimport heapq\n\ndef huffman_encode(text):\n    if not text:\n        return {}, \"\"\n    \n    freq = Counter(text)\n    heap = [[count, [char, \"\"]] for char, count in freq.items()]\n    heapq.heapify(heap)\n    \n    if len(heap) == 1:\n        heap[0][1][1] = \"0\"\n        return {heap[0][1][0]: \"0\"}, \"0\" * len(text)\n    \n    while len(heap) > 1:\n        lo = heapq.heappop(heap)\n        hi = heapq.heappop(heap)\n        for pair in lo[1:]:\n            pair[1] = '0' + pair[1]\n        for pair in hi[1:]:\n            pair[1] = '1' + pair[1]\n        heapq.heappush(heap, [lo[0] + hi[0]] + lo[1:] + hi[1:])\n    \n    codes = {char: code for char, code in heap[0][1:]}\n    encoded = ''.join(codes[c] for c in text)\n    return codes, encoded\n\ntext = \"hello world\"\ncodes, encoded = huffman_encode(text)\nprint(f\"Codes: {codes}\")\nprint(f\"Encoded bits: {len(encoded)}, Original bits: {len(text) * 8}\")\nprint(f\"Compression: {len(encoded) / (len(text) * 8):.1%}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "74",
   "q": "LZW Compression (Simplified)",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "def lzw_compress(text):\n    dictionary = {chr(i): i for i in range(256)}\n    next_code = 256\n    result = []\n    current = \"\"\n    \n    for char in text:\n        candidate = current + char\n        if candidate in dictionary:\n            current = candidate\n        else:\n            result.append(dictionary[current])\n            dictionary[candidate] = next_code\n            next_code += 1\n            current = char\n    \n    if current:\n        result.append(dictionary[current])\n    return result\n\ntext = \"TOBEORNOTTOBEORTOBEORNOT\"\ncompressed = lzw_compress(text)\nprint(f\"Original: {len(text)} chars\")\nprint(f\"Compressed: {len(compressed)} codes\")\nprint(f\"Codes: {compressed}\")"
    }
   ],
   "kind": "program"
  },
  {
   "t": "drill",
   "n": "75",
   "q": "Hex Encoding",
   "body": [
    {
     "t": "code",
     "lang": "python",
     "code": "data = \"Hello, World!\"\nhex_encoded = data.encode().hex()\nhex_decoded = bytes.fromhex(hex_encoded).decode()\nprint(f\"Hex: {hex_encoded}\")\nprint(f\"Decoded: {hex_decoded}\")\n\n# Pretty hex dump\ndef hex_dump(data, width=16):\n    data_bytes = data.encode() if isinstance(data, str) else data\n    for i in range(0, len(data_bytes), width):\n        chunk = data_bytes[i:i+width]\n        hex_part = ' '.join(f'{b:02x}' for b in chunk)\n        ascii_part = ''.join(chr(b) if 32 <= b < 127 else '.' for b in chunk)\n        print(f\"{i:08x}  {hex_part:<{width*3}}  |{ascii_part}|\")\n\nhex_dump(\"Hello, World! This is a hex dump example.\")"
    }
   ],
   "kind": "program"
  }
 ],
 "takeaways": [],
 "quiz": null,
 "interview": null
});
