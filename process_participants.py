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

# Save to JSON
output_path = os.path.join(os.getcwd(), 'participants.json')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(all_participants, f, ensure_ascii=False, indent=2)

print(f"Processed {len(all_participants)} participants. Saved to {output_path}")
