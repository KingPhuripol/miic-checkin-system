import pandas as pd
import os
import json

data_dir = "/Users/king_phuripol/Work/SmartLab/MIIC/Data"
files = [
    "17_jan_morning.csv",
    "17_jan_afternoon_room1.csv",
    "17_jan_afternoon_room2.csv",
    "18_jan_all_day.csv"
]

session_map = {
    "17_jan_morning.csv": "17_morning",
    "17_jan_afternoon_room1.csv": "17_afternoon_1",
    "17_jan_afternoon_room2.csv": "17_afternoon_2",
    "18_jan_all_day.csv": "18_all_day"
}


# --- Cleaning Functions ---
def clean_value(val):
    if pd.isna(val) or val == "" or str(val).strip() == "":
        return "-"
    return str(val).strip()

def clean_title(title):
    if not title or pd.isna(title): return "-"
    t = str(title).strip()
    if t in ["ไม่ทราบ", "-", ""]: return "-"
    
    mapping = {
        "น.ส.": "นางสาว", "น.ส": "นางสาว", "นส": "นางสาว",
        "ดร": "ดร.",
        "ผศ": "ผศ.", "ผู้ช่วยศาสตราจารย์": "ผศ.",
        "รศ.ดร.": "รศ.ดร.", "รศ. ดร.": "รศ.ดร.", "รองศาสตราจารย์ ดร.": "รศ.ดร.",
        "คุุณ": "คุณ",
        "Assoc.Prof": "รศ.", "Assistant MD": "ผศ.นพ."
    }
    return mapping.get(t, t)

def clean_org(org):
    if not org or pd.isna(org): return "-"
    o = str(org).strip()
    if o in ["-", ""]: return "-"
    
    # Check if it's likely a position (contains "นายก", "ผู้จัดการ", "CEO")
    if any(x in o for x in ["นายก", "ผู้จัดการ", "CEO", "Chief", "Executive"]):
        return o 
        
    mapping = {
        "Nhealth": "N Health", "N Health ": "N Health", "N healtg": "N Health",
        "National Healthcare Systems": "N Health",
        "มศว": "มศว.", "มหาวิทยาลัยศรีนครินทรวิโรฒ": "มศว.",
        "สวทช": "สวทช.",
        "Mtec": "MTEC", "MTEC": "MTEC", "ศูนย์เทคโนโลยีโลหะและวัสดุแห่งชาติ": "MTEC",
        "จุฬาฯ": "จุฬาลงกรณ์มหาวิทยาลัย", "คณะวิศวกรรม จุฬาฯ": "คณะวิศวกรรมศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย",
        "Mahidol univ.": "มหาวิทยาลัยมหิดล", "Mahidol​ univ. ": "มหาวิทยาลัยมหิดล"
    }
    return mapping.get(o, o)

def clean_status(status):
    if not status or pd.isna(status): return "VISITOR"
    s = str(status).strip().upper()
    if s == "": return "VISITOR"
    return s

def clean_follower_names(follower_str):
    if not follower_str or pd.isna(follower_str): return []
    s = str(follower_str).strip()
    if s in ["-", "", "ไม่มี"]: return []
    
    # Replace "และ" with ","
    s = s.replace("และ", ",")
    
    # Split by ","
    parts = s.split(",")
    
    names = []
    for p in parts:
        n = p.strip()
        if n:
            names.append(n)
    return names

all_participants = []
participant_id = 1

for filename in files:
    filepath = os.path.join(data_dir, filename)
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        continue
        
    session = session_map[filename]
    print(f"Processing {filename}...")
    
    # Find header row
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    header_row_idx = -1
    for i, line in enumerate(lines):
        if line.startswith("ลำดับ,"):
            header_row_idx = i
            break
            
    if header_row_idx == -1:
        print(f"Could not find header for {filename}")
        continue
        
    # Read CSV
    try:
        df = pd.read_csv(filepath, header=header_row_idx)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        continue
    
    # --- Left Side Processing ---
    # 0: No, 1: Title, 2: Name, 3: Email, 4: Accept, 5: Phone, 6: Status, 7: Follower?, 8: Follower Name, 9: Org, 10: Note
    left_df = df.iloc[:, 0:11].copy()
    left_df.columns = ['no', 'title', 'name', 'email', 'accept_email', 'phone', 'status', 'has_follower', 'follower_name', 'org', 'note']
    
    # Clean left side
    left_df = left_df.dropna(subset=['name'])
    left_df = left_df[left_df['name'] != 'ระบุ ชื่อ-นามสกุล'] 
    
    for _, row in left_df.iterrows():
        if pd.isna(row['name']): continue
        name_val = str(row['name']).strip()
        if not name_val: continue
        
        p = {
            'id': participant_id,
            'title': clean_title(row['title']),
            'name': name_val,
            'email': clean_value(row['email']),
            'phone': clean_value(row['phone']),
            'status': clean_status(row['status']),
            'org': clean_org(row['org']),
            'note': clean_value(row['note']),
            'session': session,
            'source': 'main_list'
        }
        all_participants.append(p)
        participant_id += 1
        
        # Check for followers
        if row.get('has_follower') and 'ท่าน' in str(row['has_follower']):
             follower_names = clean_follower_names(row.get('follower_name'))
             for fname in follower_names:
                 # Check if this follower is already in the list (by name) to avoid duplicates
                 # if they are also listed as a main participant
                 # But checking against all_participants is slow and they might be added later.
                 # For now, just add them. The user can filter duplicates if needed, 
                 # or we assume if they are listed as follower here, they should be added.
                 # However, we saw "อนงค์นาฏ ขาวสังข์" listed as follower AND as main participant.
                 # If we add her here, she will be duplicated.
                 # But maybe that's better than missing her if she wasn't a main participant.
                 
                 fp = {
                    'id': participant_id,
                    'title': "-", 
                    'name': fname,
                    'email': "-",
                    'phone': "-",
                    'status': "VISITOR", 
                    'org': clean_org(row['org']), 
                    'note': f"ผู้ติดตามของ {name_val}",
                    'session': session,
                    'source': 'follower'
                 }
                 all_participants.append(fp)
                 participant_id += 1

    # --- Right Side Processing ---
    right_start_idx = 12
    if right_start_idx >= len(df.columns):
        continue
        
    right_df = None
    
    # Check if header is in the main header row (e.g. "ลำดับ.1")
    # We look for a column that contains "ลำดับ" starting from index 12
    col_indices = []
    found_in_header = False
    
    for i in range(right_start_idx, len(df.columns)):
        if "ลำดับ" in str(df.columns[i]):
            # Found the start of the right side table
            right_df = df.iloc[:, i:].copy()
            found_in_header = True
            break
            
    if not found_in_header:
        # Check if header is in the first row of data
        first_row_val = str(df.iloc[0, right_start_idx]) if len(df) > 0 else ""
        if "ลำดับ" in first_row_val:
            # Use the first row as header
            right_df = df.iloc[1:, right_start_idx:].copy()
            # Set columns from the first row
            right_df.columns = df.iloc[0, right_start_idx:].values
    
    if right_df is not None:
        # Identify columns by name
        name_col = None
        title_col = None
        status_col = None
        note_col = None
        
        for col in right_df.columns:
            c = str(col)
            if 'ชื่อ' in c: name_col = col
            elif 'ยศ' in c or 'คำนำหน้า' in c: title_col = col
            elif 'Status' in c or 'status' in c: status_col = col
            elif 'หมายเหตุ' in c: note_col = col
            
        if name_col:
            right_df = right_df.dropna(subset=[name_col])
            for _, row in right_df.iterrows():
                if pd.isna(row[name_col]): continue
                name_val = str(row[name_col]).strip()
                if name_val == 'ระบุ ชื่อ-นามสกุล': continue
                if not name_val: continue
                
                p = {
                    'id': participant_id,
                    'title': clean_title(row[title_col]) if title_col else "-",
                    'name': name_val,
                    'email': "-",
                    'phone': "-",
                    'status': clean_status(row[status_col]) if status_col else "VIP",
                    'org': "-",
                    'note': clean_value(row[note_col]) if note_col else "-",
                    'session': session,
                    'source': 'vip_list'
                }
                all_participants.append(p)
                participant_id += 1

# --- Process all_responses.csv (The Master List) ---
response_file = "all_responses.csv"
response_path = os.path.join(data_dir, response_file)

if os.path.exists(response_path):
    print(f"Processing {response_file}...")
    try:
        df_resp = pd.read_csv(response_path)
        
        # Create a set of existing (name, session) to avoid duplicates
        existing_entries = set()
        for p in all_participants:
            existing_entries.add((p['name'], p['session']))
            
        # Map columns
        # 'กรุณาเลือกวันที่ต้องการเข้าร่วมฟังเสวนา' -> 17 Morning (Index 3)
        # 'กรุณาเลือกห้องที่ต้องการเข้าร่วมฟังเสวนา' -> 17 Afternoon (Index 4)
        # 'กรุณาเลือกวันที่ต้องการเข้าร่วมฟังเสวนา.1' -> 18 All Day (Index 5)
        
        col_17_morning = df_resp.columns[3]
        col_17_afternoon = df_resp.columns[4]
        col_18_all_day = df_resp.columns[5]
        
        col_title = 'ระบุ ยศ ตำแหน่ง หรือคำนำหน้า'
        col_name = 'ระบุ ชื่อ-นามสกุล'
        col_email = 'ระบุ E-mail '
        col_phone = 'ระบุ เบอร์ติดต่อ'
        col_follower = 'มีผู้ติดตามมาด้วยหรือไม่ *หากมากกว่า 2 ท่านกรุณาระบุ อื่นๆพร้อมบอกจำนวน'
        col_follower_name = '*หากมีผู้ติดตาม กรุณากรอกชื่อ-นามสกุล ของผู้ติดตาม'
        col_org = 'ระบุ สังกัดของท่าน'
        
        for _, row in df_resp.iterrows():
            name_val = str(row[col_name]).strip()
            if not name_val or pd.isna(row[col_name]): continue
            
            title_val = clean_title(row.get(col_title))
            email_val = clean_value(row.get(col_email))
            phone_val = clean_value(row.get(col_phone))
            org_val = clean_org(row.get(col_org))
            
            # Determine sessions
            sessions_to_add = []
            
            # 17 Morning
            if row[col_17_morning] == 'เข้าร่วม':
                sessions_to_add.append('17_morning')
                
            # 17 Afternoon
            if row[col_17_afternoon] == 'ห้องที่ 1':
                sessions_to_add.append('17_afternoon_1')
            elif row[col_17_afternoon] == 'ห้องที่ 2':
                sessions_to_add.append('17_afternoon_2')
                
            # 18 All Day
            if row[col_18_all_day] == 'เข้าร่วม':
                sessions_to_add.append('18_all_day')
                
            for sess in sessions_to_add:
                if (name_val, sess) not in existing_entries:
                    print(f"Adding missing participant: {name_val} for {sess}")
                    p = {
                        'id': participant_id,
                        'title': title_val,
                        'name': name_val,
                        'email': email_val,
                        'phone': phone_val,
                        'status': 'VISITOR', # Default to VISITOR for online responses
                        'org': org_val,
                        'note': 'From all_responses.csv',
                        'session': sess,
                        'source': 'all_responses'
                    }
                    all_participants.append(p)
                    existing_entries.add((name_val, sess))
                    participant_id += 1
                    
                    # Check followers for this session
                    if pd.notna(row.get(col_follower)) and 'ท่าน' in str(row[col_follower]):
                         follower_names = clean_follower_names(row.get(col_follower_name))
                         for fname in follower_names:
                             if (fname, sess) not in existing_entries:
                                 print(f"Adding missing follower: {fname} for {sess}")
                                 fp = {
                                    'id': participant_id,
                                    'title': "-", 
                                    'name': fname,
                                    'email': "-",
                                    'phone': "-",
                                    'status': "VISITOR", 
                                    'org': org_val, 
                                    'note': f"ผู้ติดตามของ {name_val} (From all_responses)",
                                    'session': sess,
                                    'source': 'follower_all_responses'
                                 }
                                 all_participants.append(fp)
                                 existing_entries.add((fname, sess))
                                 participant_id += 1

    except Exception as e:
        print(f"Error processing all_responses.csv: {e}")

# Save to JSON
output_path = os.path.join(os.getcwd(), 'participants.json')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(all_participants, f, ensure_ascii=False, indent=2)

print(f"Processed {len(all_participants)} participants. Saved to {output_path}")

# Also create data.js
data_js_path = os.path.join(os.getcwd(), 'data.js')
with open(data_js_path, 'w', encoding='utf-8') as f:
    f.write('const initialParticipants = ')
    json.dump(all_participants, f, ensure_ascii=False, indent=2)

print(f"Saved to {data_js_path}")
