import pandas as pd
import os
import json

data_dir = "/Users/king_phuripol/Work/SmartLab/MIIC/Data"

# File mapping
files = {
    "secondary": "miic_secondary_education.csv",  # มัธยมศึกษา
    "higher": "miic_higher_education.csv"  # อุดมศึกษา
}

def clean_value(val):
    """Clean empty values to '-'"""
    if pd.isna(val) or val == "" or str(val).strip() == "":
        return "-"
    return str(val).strip()

def extract_participants(filepath, education_level, session_id):
    """Extract participants from CSV file"""
    participants = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find header row (starts with "ลำดับ")
    header_row_idx = -1
    for i, line in enumerate(lines):
        if line.startswith("ลำดับ,"):
            header_row_idx = i
            break
    
    if header_row_idx == -1:
        print(f"Could not find header for {filepath}")
        return []
    
    # Read CSV from header row
    df = pd.read_csv(filepath, header=header_row_idx)
    
    current_team_num = None
    current_team_name = None
    current_institution = None
    current_advisor = None
    
    participant_id = 1
    
    for idx, row in df.iterrows():
        # Check if this is a new team row (has team number in ลำดับ column)
        team_num = row.get('ลำดับ', '')
        
        if pd.notna(team_num) and str(team_num).strip() != '':
            try:
                current_team_num = int(team_num)
                current_team_name = clean_value(row.get('ชื่อทีม', ''))
                current_institution = clean_value(row.get('สถาบัน', ''))
                current_advisor = clean_value(row.get('อาจารย์ที่ปรึกษา', ''))
            except:
                pass
        
        # Get participant name
        name = row.get('ชื่อ-นามสกุล', '')
        if pd.isna(name) or str(name).strip() == '':
            continue
        
        name = str(name).strip()
        
        # Get participation status
        status_raw = row.get('เข้าร่วม/ไม่เข้าร่วม', '')
        if pd.isna(status_raw):
            status_raw = ''
        status_raw = str(status_raw).strip()
        
        # Skip if not participating
        if status_raw == 'ไม่เข้าร่วม':
            continue
        
        participant = {
            'id': participant_id,
            'name': name,
            'email': clean_value(row.get('E-Mail', '')),
            'phone': clean_value(row.get('เบอร์ติดต่อ', '')),
            'team_num': current_team_num,
            'team_name': current_team_name if current_team_name else '-',
            'institution': current_institution if current_institution else '-',
            'advisor': current_advisor if current_advisor else '-',
            'status': 'Competitor',  # All are competitors in MIIC
            'education_level': education_level,
            'session': session_id,
            'participation_status': status_raw if status_raw else 'เข้าร่วม'
        }
        
        participants.append(participant)
        participant_id += 1
        
        # Check for advisor (only on team row)
        if pd.notna(team_num) and str(team_num).strip() != '':
            advisor_name = row.get('อาจารย์ที่ปรึกษา', '')
            advisor_status = row.get('เข้าร่วม/ไม่เข้าร่วม.1', '')
            
            if pd.notna(advisor_name) and str(advisor_name).strip() not in ['', '-']:
                 # Check status
                 status_str = str(advisor_status).strip() if pd.notna(advisor_status) else ''
                 
                 if status_str == 'เข้าร่วม':
                     # Add advisor
                     adv_name = str(advisor_name).strip()
                     
                     advisor = {
                        'id': participant_id,
                        'name': adv_name,
                        'email': clean_value(row.get('E-Mail.1', '')),
                        'phone': clean_value(row.get('เบอร์ติดต่อ.1', '')),
                        'team_num': current_team_num,
                        'team_name': current_team_name if current_team_name else '-',
                        'institution': current_institution if current_institution else '-',
                        'advisor': '-', 
                        'status': 'Advisor',
                        'education_level': education_level,
                        'session': session_id,
                        'participation_status': 'เข้าร่วม'
                     }
                     participants.append(advisor)
                     participant_id += 1
    
    return participants

def extract_jury(filepath, education_level, session_id, start_id):
    """Extract jury members from the right side of CSV"""
    jury_members = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find header row
    header_row_idx = -1
    for i, line in enumerate(lines):
        if line.startswith("ลำดับ,"):
            header_row_idx = i
            break
    
    if header_row_idx == -1:
        return []
    
    df = pd.read_csv(filepath, header=header_row_idx)
    
    # Find jury columns (ลำดับ.1, ตำแหน่ง, ชื่อ-นามสกุล.1)
    jury_id = start_id
    
    for idx, row in df.iterrows():
        jury_num = row.get('ลำดับ.1', '')
        if pd.isna(jury_num) or str(jury_num).strip() == '':
            continue
        
        try:
            int(jury_num)
        except:
            continue
        
        title = clean_value(row.get('ตำแหน่ง', ''))
        name = row.get('ชื่อ-นามสกุล.1', '')
        
        if pd.isna(name) or str(name).strip() == '':
            continue
        
        name = str(name).strip()
        note = clean_value(row.get('หมายเหตุ.1', ''))
        
        # Skip if note indicates they can't come
        if 'มาไม่ได้' in note:
            continue
        
        jury_member = {
            'id': jury_id,
            'name': f"{title}{name}" if title != '-' else name,
            'email': '-',
            'phone': '-',
            'team_num': None,
            'team_name': '-',
            'institution': '-',
            'advisor': '-',
            'status': 'Jury',
            'education_level': education_level,
            'session': session_id,
            'participation_status': 'เข้าร่วม',
            'note': note
        }
        
        jury_members.append(jury_member)
        jury_id += 1
    
    return jury_members

# Process both files
all_participants = []

# Process Secondary Education (มัธยมศึกษา)
secondary_path = os.path.join(data_dir, files["secondary"])
if os.path.exists(secondary_path):
    print(f"Processing {files['secondary']}...")
    secondary_participants = extract_participants(secondary_path, "มัธยมศึกษา", "secondary")
    print(f"  Found {len(secondary_participants)} participants")
    
    # Renumber IDs
    for i, p in enumerate(secondary_participants):
        p['id'] = i + 1
    
    all_participants.extend(secondary_participants)
    
    # Extract jury for secondary
    jury_start_id = len(all_participants) + 1
    secondary_jury = extract_jury(secondary_path, "มัธยมศึกษา", "secondary", jury_start_id)
    print(f"  Found {len(secondary_jury)} jury members")
    all_participants.extend(secondary_jury)

# Process Higher Education (อุดมศึกษา)  
higher_path = os.path.join(data_dir, files["higher"])
if os.path.exists(higher_path):
    print(f"Processing {files['higher']}...")
    higher_start_id = len(all_participants) + 1
    higher_participants = extract_participants(higher_path, "อุดมศึกษา", "higher")
    print(f"  Found {len(higher_participants)} participants")
    
    # Renumber IDs
    for i, p in enumerate(higher_participants):
        p['id'] = higher_start_id + i
    
    all_participants.extend(higher_participants)
    
    # Extract jury for higher education
    jury_start_id = len(all_participants) + 1
    higher_jury = extract_jury(higher_path, "อุดมศึกษา", "higher", jury_start_id)
    print(f"  Found {len(higher_jury)} jury members")
    all_participants.extend(higher_jury)

# Save to JSON
output_path = os.path.join(os.getcwd(), 'miic_participants.json')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(all_participants, f, ensure_ascii=False, indent=2)

print(f"\nTotal: {len(all_participants)} participants")
print(f"Saved to {output_path}")

# Also create data.js for MIIC
data_js_path = os.path.join(os.getcwd(), 'miic_data.js')
with open(data_js_path, 'w', encoding='utf-8') as f:
    f.write('const initialMiicParticipants = \n')
    json.dump(all_participants, f, ensure_ascii=False, indent=2)

print(f"Saved to {data_js_path}")

# Print summary by education level
print("\n=== Summary ===")
secondary_count = len([p for p in all_participants if p['education_level'] == 'มัธยมศึกษา'])
higher_count = len([p for p in all_participants if p['education_level'] == 'อุดมศึกษา'])
jury_count = len([p for p in all_participants if p['status'] == 'Jury'])
competitor_count = len([p for p in all_participants if p['status'] == 'Competitor'])

print(f"มัธยมศึกษา: {secondary_count}")
print(f"อุดมศึกษา: {higher_count}")
print(f"Competitors: {competitor_count}")
print(f"Jury: {jury_count}")
