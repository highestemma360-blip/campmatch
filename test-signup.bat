@echo off
curl.exe -s -w "\nHTTP_CODE: %{http_code}\n" -X POST "https://campmatch-7f53.onrender.com/api/signup" -H "Content-Type: application/json" -d '{"email":"verify@st.umat.edu.gh","password":"Test1234!","device_info":"verify"}'
