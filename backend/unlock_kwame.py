import sqlite3
db_path = 'C:/Users/user/AppData/Local/Temp/opencode/cm_preview_data/campmatch.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("UPDATE users SET locked_until = NULL, failed_login_attempts = 0, locked_reason = '' WHERE email = 'kwame@st.umat.edu.gh'")
conn.commit()
print('Unlocked kwame')
conn.close()
