import sqlite3
conn = sqlite3.connect('campmatch.db')
cur = conn.cursor()
cur.execute("UPDATE users SET locked_until = NULL, failed_login_attempts = 0, locked_reason = '' WHERE email = 'kwame@st.umat.edu.gh'")
conn.commit()
print('Unlocked kwame account')
conn.close()
