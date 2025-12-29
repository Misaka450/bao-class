import re

# Read the file
with open(r'd:\code\qoder\bao-class\api\src\routes\ai.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace max_tokens (already done, but let's ensure)
content = content.replace('max_tokens: 300,', 'max_tokens: 500,')

# Find and replace the choices parsing logic
old_pattern = r'''                    const choice = response\.choices\[0\];
                    if \(choice\.message && choice\.message\.content\) \{
                        console\.log\('Found response\.choices\[0\]\.message\.content:', choice\.message\.content\);
                        comment = choice\.message\.content;
                    \} else if \(choice\.text\) \{
                        console\.log\('Found response\.choices\[0\]\.text:', choice\.text\);
                        comment = choice\.text;
                    \}'''

new_code = '''                    const choice = response.choices[0];
                    // Check reasoning_content first (Qwen model specific)
                    if (choice.message && choice.message.reasoning_content) {
                        console.log('Found response.choices[0].message.reasoning_content');
                        comment = choice.message.reasoning_content;
                    }
                    // Then check content
                    else if (choice.message && choice.message.content) {
                        console.log('Found response.choices[0].message.content:', choice.message.content);
                        comment = choice.message.content;
                    } else if (choice.text) {
                        console.log('Found response.choices[0].text:', choice.text);
                        comment = choice.text;
                    }'''

# Try simple string replacement first
if 'choice.message && choice.message.content' in content:
    # Find the section
    lines = content.split('\n')
    new_lines = []
    i = 0
    while i < len(lines):
        if 'const choice = response.choices[0];' in lines[i]:
            # Found the start, replace the next 7 lines
            new_lines.append(lines[i])  # Add the const choice line
            # Skip the old if/else block (next 7 lines)
            i += 1
            while i < len(lines) and not ('}' in lines[i] and 'else if (choice.text)' not in lines[i-1]):
                i += 1
            # Add new code
            new_lines.append('                    // Check reasoning_content first (Qwen model specific)')
            new_lines.append('                    if (choice.message && choice.message.reasoning_content) {')
            new_lines.append("                        console.log('Found response.choices[0].message.reasoning_content');")
            new_lines.append('                        comment = choice.message.reasoning_content;')
            new_lines.append('                    }')
            new_lines.append('                    // Then check content')
            new_lines.append('                    else if (choice.message && choice.message.content) {')
            new_lines.append("                        console.log('Found response.choices[0].message.content:', choice.message.content);")
            new_lines.append('                        comment = choice.message.content;')
            new_lines.append('                    } else if (choice.text) {')
            new_lines.append("                        console.log('Found response.choices[0].text:', choice.text);")
            new_lines.append('                        comment = choice.text;')
            new_lines.append('                    }')
        else:
            new_lines.append(lines[i])
        i += 1
    
    content = '\n'.join(new_lines)

# Write back
with open(r'd:\code\qoder\bao-class\api\src\routes\ai.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("File updated successfully!")
