import re
import sys

def check_jsx(filename):
    try:
        with open(filename, 'r') as f:
            content = f.read()

        # Remove strings and comments to avoid confusion
        content = re.sub(r'//.*?\n', '\n', content)
        content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        content = re.sub(r'"([^"\\]|\\.)*"', '""', content)
        content = re.sub(r"'([^'\\]|\\.)*'", "''", content)
        content = re.sub(r'`([^`\\]|\\.)*`', '``', content, flags=re.DOTALL)

        print(f"File: {filename}")
        
        # Tags to track (common JSX elements)
        track_tags = ['div', 'section', 'header', 'footer', 'main', 'p', 'span', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'form', 'label', 'input', 'textarea', 'select', 'option', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'a', 'i', 'svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'text', 'marker', 'defs', 'clippath', 'lineargradient', 'stop', 'use', 'image', 'mask', 'pattern', 'filter', 'feGaussianBlur', 'feOffset', 'feBlend', 'feComponentTransfer', 'feColorMatrix', 'feFlood', 'feComposite', 'feMorphology', 'feSpecularLighting', 'feDiffuseLighting', 'feDistantLight', 'fePointLight', 'feSpotLight', 'feTile', 'feTurbulence', 'feDropShadow']
        
        stack = []
        lines = content.split('\n')
        for i, line in enumerate(lines):
            line_num = i + 1
            # Find all tags (opening or closing)
            # Regex to find <tag, <TAG, </tag, </TAG
            matches = re.finditer(r'<(/?[a-zA-Z0-9_\-\.]+)(\b|>)', line)
            for m in matches:
                tag_full = m.group(1)
                is_close = tag_full.startswith('/')
                tag_name = tag_full[1:] if is_close else tag_full
                
                # Filter trackable tags and ignore components (Upper case) unless they're standard React components
                # Actually let's track everything that looks like a JSX tag
                
                # Check for self-closing in the same line (naively)
                if not is_close:
                    content_after_tag = line[m.end():]
                    # Looking for /> before next >
                    # This is tricky because of multi-line tags.
                    # But for balancing, we care about tags that DON'T have a closing / on the same line or next lines.
                    # Actually, if the tag name is a standard HTML tag or a component:
                    pass
                
                # For this simple script, we'll focus ONLY on <div> and </div> across multiple files as it's the most common culprit
                if tag_name.lower() == 'div':
                    if is_close:
                        if not stack:
                            print(f"  Unexpected </div> at line {line_num}")
                        else:
                            stack.pop()
                    else:
                        # Check if self-closing <div ... />
                        # Find the closing > of this tag.
                        remaining_line = line[m.start():]
                        # Find index of >
                        end_tag_idx = remaining_line.find('>')
                        if end_tag_idx != -1:
                            if remaining_line[end_tag_idx-1] == '/':
                                # Self-closing
                                continue
                        stack.append((tag_name, line_num))
        
        if stack:
            print(f"  Unclosed tags: {stack}")
        else:
            print("  All <div> tags balanced.")

    except Exception as e:
        print(f"Error checking {filename}: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 check_jsx.py <filename>")
    else:
        check_jsx(sys.argv[1])
