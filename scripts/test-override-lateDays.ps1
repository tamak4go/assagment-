$ErrorActionPreference = "Stop"

$base = "http://localhost:3000"

Write-Host "Logging in..."
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/api/login" -ContentType "application/json" -Body '{"username":"admin","password":"123456"}'
$token = $login.token

$jsonHeaders = @{
  Authorization = "Bearer $token"
  "Content-Type" = "application/json"
}

$authHeaders = @{
  Authorization = "Bearer $token"
}

Write-Host "Fetching bookings..."
$all = Invoke-RestMethod -Method Get -Uri "$base/bookings/api" -Headers $authHeaders
$completed = $all | Where-Object { $_.status -eq "completed" } | Select-Object -First 1
if (-not $completed) {
  throw "No completed booking found to test"
}

$id = $completed._id
Write-Host "Testing bookingId: $id"
Write-Host "Before:" ($completed | Select-Object lateDays, lateMinutes, penaltyAmount, totalAmount | ConvertTo-Json)

$overrideDays = 2
Write-Host "Overriding lateDays to $overrideDays ..."
$updated = Invoke-RestMethod -Method Put -Uri "$base/bookings/$id" -Headers $jsonHeaders -Body (ConvertTo-Json @{
  lateDays = $overrideDays
})

Write-Host "After:" ($updated | Select-Object lateDays, lateMinutes, penaltyAmount, totalAmount | ConvertTo-Json)

