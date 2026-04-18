$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwicm9sZSI6InBsYXllciIsImV4cCI6MTc3NTgzNDkwMX0.nG_jmg41ZYnpSmk6XIQCWQVFALbDOGJ0wSfXZzPQ3eQ"
$headers = @{ Authorization = "Bearer $token" }
$body = '{"name":"Sebastian","concept":"Priest","ambition":"Revenge","desire":"Peace"}'
Invoke-RestMethod -Method POST -Uri "http://localhost:8000/api/characters/wizard/step/1" -Headers $headers -ContentType "application/json" -Body $body
