from pathlib import Path
import re

root = Path(__file__).resolve().parent
files = sorted((root / '__tests__').glob('*.js'))

alert_pattern = re.compile(r'\b(?:global\.|window\.)?alert\b|\bexpect\s*\(\s*alert\b|\balertSpy\b')

mock_path_new = 'jest.mock("../scripts/toast.js"'
import_require_line = 'const { showToast } = require("../scripts/toast.js");'
import_import_line = 'import { showToast } from "../scripts/toast.js";'

success_words = ["successfully", "saved", "created", "updated", "exported", "added to cart", "registered", "approved"]
error_words = ["failed", "invalid", "not found", "could not", "no longer exists", "already in use", "popup closed", "access denied", "suspended", "error", "not exist", "profile not found", "sign-in failed"]
warning_words = ["please", "must be", "required", "select", "enter", "you must", "only", "cannot", "account is suspended", "missing", "no user"]
info_words = ["if an account exists", "note", "you must be logged in", "must be logged in", "if this account"]


def classify_message(msg: str) -> str:
    lower = msg.strip().lower()
    if any(phrase in lower for phrase in info_words):
        return 'info'
    if any(word in lower for word in success_words):
        return 'success'
    if any(word in lower for word in error_words):
        return 'error'
    if any(word in lower for word in warning_words):
        return 'warning'
    if lower.startswith('item added') or lower.startswith('review submitted'):
        return 'success'
    if 'warning' in lower:
        return 'warning'
    return 'error'


def replace_ttoast(match):
    arg = match.group('arg')
    text = arg.strip()
    if text.startswith('expect.'):
        return f'expect(showToast).toHaveBeenCalledWith({text}, "error")'
    quote = text[0] if text and text[0] in ('"', "'") else None
    message = text[1:-1] if quote else text
    type_name = classify_message(message)
    return f'expect(showToast).toHaveBeenCalledWith({text}, "{type_name}")'

pattern_called = re.compile(r'expect\s*\(\s*(?:global\.|window\.)?alert\s*\)\.toHaveBeenCalledWith\(\s*(?P<arg>[\s\S]*?)\s*\)', re.M | re.DOTALL)
pattern_called_simple = re.compile(r'expect\s*\(\s*(?:global\.|window\.)?alert\s*\)\.toHaveBeenCalled\(\s*\)', re.M)
pattern_not_called = re.compile(r'expect\s*\(\s*(?:global\.|window\.)?alert\s*\)\.not\.toHaveBeenCalled\(\s*\)', re.M)
pattern_not_called_with = re.compile(r'expect\s*\(\s*(?:global\.|window\.)?alert\s*\)\.not\.toHaveBeenCalledWith\(\s*(?P<arg>[\s\S]*?)\s*\)', re.M | re.DOTALL)
pattern_direct = re.compile(r'expect\s*\(\s*alert\s*\)\.toHaveBeenCalledWith\(\s*(?P<arg>[\s\S]*?)\s*\)', re.M | re.DOTALL)
pattern_direct_simple = re.compile(r'expect\s*\(\s*alert\s*\)\.toHaveBeenCalled\(\s*\)', re.M)
pattern_direct_not = re.compile(r'expect\s*\(\s*alert\s*\)\.not\.toHaveBeenCalled\(\s*\)', re.M)
pattern_direct_not_with = re.compile(r'expect\s*\(\s*alert\s*\)\.not\.toHaveBeenCalledWith\(\s*(?P<arg>[\s\S]*?)\s*\)', re.M | re.DOTALL)
pattern_alertspy_called = re.compile(r'expect\s*\(\s*alertSpy\s*\)\.toHaveBeenCalledWith\(\s*(?P<arg>[\s\S]*?)\s*\)', re.M | re.DOTALL)
pattern_alertspy_not_called = re.compile(r'expect\s*\(\s*alertSpy\s*\)\.not\.toHaveBeenCalled\(\s*\)', re.M)
pattern_alertspy_not_called_with = re.compile(r'expect\s*\(\s*alertSpy\s*\)\.not\.toHaveBeenCalledWith\(\s*(?P<arg>[\s\S]*?)\s*\)', re.M | re.DOTALL)

summary = []
for path in files:
    text = path.read_text(encoding='utf-8')
    if not alert_pattern.search(text):
        continue
    changed = False
    original = text
    if 'jest.mock("../toast.js"' in text or "jest.mock('../toast.js'" in text:
        text = text.replace('jest.mock("../toast.js"', mock_path_new)
        text = text.replace("jest.mock('../toast.js')", "jest.mock('../scripts/toast.js')")
        changed = True
    if 'require("../toast.js")' in text:
        text = text.replace('require("../toast.js")', 'require("../scripts/toast.js")')
        changed = True
    if "require('../toast.js')" in text:
        text = text.replace("require('../toast.js')", "require('../scripts/toast.js')")
        changed = True
    if 'from "../toast.js"' in text:
        text = text.replace('from "../toast.js"', 'from "../scripts/toast.js"')
        changed = True
    if "from '../toast.js'" in text:
        text = text.replace("from '../toast.js'", "from '../scripts/toast.js'")
        changed = True

    if 'jest.mock("../scripts/toast.js"' not in text and "jest.mock('../scripts/toast.js'" not in text:
        m = re.search(r'^(?:\s*jest\.mock\([^\n]*\)\s*\n)+', text, re.M)
        insert = 'jest.mock("../scripts/toast.js", () => ({\n  showToast: jest.fn()\n}));\n\n'
        if m:
            text = text[:m.end()] + insert + text[m.end():]
        else:
            text = insert + text
        changed = True

    if 'const { showToast } = require("../scripts/toast.js");' not in text and 'import { showToast } from "../scripts/toast.js";' not in text:
        if 'import ' in text and 'require(' not in text:
            ms = list(re.finditer(r'^(?:\s*import .*\n)+', text, re.M))
            if ms:
                last = ms[-1]
                text = text[:last.end()] + import_import_line + '\n' + text[last.end():]
            else:
                text = import_import_line + '\n' + text
        else:
            m = re.search(r'jest\.mock\("\.\./scripts/toast\.js"[\s\S]*?\}\)\s*;?\s*\n', text)
            if m:
                text = text[:m.end()] + import_require_line + '\n' + text[m.end():]
            else:
                text = import_require_line + '\n' + text
        changed = True

    text, n = pattern_called.subn(lambda m: replace_ttoast(m), text)
    if n:
        changed = True
    text, n2 = pattern_direct.subn(lambda m: replace_ttoast(m), text)
    if n2:
        changed = True
    text, n3 = pattern_called_simple.subn('expect(showToast).toHaveBeenCalled()', text)
    if n3:
        changed = True
    text, n4 = pattern_direct_simple.subn('expect(showToast).toHaveBeenCalled()', text)
    if n4:
        changed = True
    text, n5 = pattern_not_called.subn('expect(showToast).not.toHaveBeenCalled()', text)
    if n5:
        changed = True
    text, n6 = pattern_direct_not.subn('expect(showToast).not.toHaveBeenCalled()', text)
    if n6:
        changed = True
    text, n7 = pattern_not_called_with.subn(lambda m: f'expect(showToast).not.toHaveBeenCalledWith({m.group("arg")})', text)
    if n7:
        changed = True
    text, n8 = pattern_direct_not_with.subn(lambda m: f'expect(showToast).not.toHaveBeenCalledWith({m.group("arg")})', text)
    if n8:
        changed = True

    if changed and text != original:
        path.write_text(text, encoding='utf-8')
        summary.append(path.name)

for name in summary:
    print(f'Updated {name}')
print(f'Processed {len(summary)} files')
