import re

with open('frontend/components/LoginScreen.tsx', 'r') as f:
    content = f.read()

# Remove background gradients
content = re.sub(r'\{/\* Minimalist Background Gradients \*/\}.*?</div>', '', content, flags=re.DOTALL)

# Update state type
content = content.replace("<'citizen' | 'officer' | 'doctor' | null>", "<'citizen' | 'doctor' | null>")

# Remove the Officer button
officer_btn_pattern = r'<button\s+onClick=\{\(\) => \{ setSelectedPortalRole\(\'officer\'\);.*?</button>'
content = re.sub(officer_btn_pattern, '', content, flags=re.DOTALL)

# Update ternaries
content = content.replace("selectedPortalRole === 'officer' ? 'Officer Personnel' : 'Authorized Citizens'", "selectedPortalRole === 'doctor' ? 'Clinical Doctors' : 'Authorized Citizens'")
content = content.replace("selectedPortalRole === 'officer' ? 'Node' : 'Link'", "selectedPortalRole === 'doctor' ? 'Doctor Node' : 'Link'")
content = content.replace("selectedPortalRole === 'officer' ? 'Personnel' : 'Citizen'", "selectedPortalRole === 'doctor' ? 'Clinical' : 'Citizen'")
content = content.replace("selectedPortalRole === 'officer' ? 'Officer Node' : 'Guardian Link'", "selectedPortalRole === 'doctor' ? 'Doctor Node' : 'Guardian Link'")
content = content.replace("selectedPortalRole === 'officer' ? 'Officer Personnel Registry' : 'Guardian Link Setup'", "selectedPortalRole === 'doctor' ? 'Doctor Personnel Registry' : 'Guardian Link Setup'")

# Also update the Medical Doctor Button Colors to match the Deep Green / White
content = content.replace("hover:border-indigo-500", "hover:border-emerald-500")
content = content.replace("bg-indigo-50", "bg-emerald-50")
content = content.replace("text-indigo-500", "text-emerald-500")
content = content.replace("group-hover:bg-indigo-600", "group-hover:bg-emerald-600")
content = content.replace("group-hover:text-indigo-100", "group-hover:text-emerald-100")

with open('frontend/components/LoginScreen.tsx', 'w') as f:
    f.write(content)
