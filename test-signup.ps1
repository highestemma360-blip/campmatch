$body = @{email='verify2@st.umat.edu.gh'; password='Test1234!'; device_info='verify'} | ConvertTo-Json
try {
    $resp = Invoke-WebRequest -Uri 'https://campmatch-7f53.onrender.com/api/signup' -Method POST -ContentType 'application/json' -Body $body -UseBasicParsing -ErrorAction Stop
    Write-Host "SUCCESS: $($resp.StatusCode)"
    Write-Host $resp.Content
} catch {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Host "ERROR: $($reader.ReadToEnd())"
}
