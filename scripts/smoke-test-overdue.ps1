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

$carNumber = "TEST-001"

Write-Host "Ensuring test car exists..."
try {
  Invoke-RestMethod -Method Post -Uri "$base/cars" -Headers $jsonHeaders -Body (ConvertTo-Json @{
    carNumber   = $carNumber
    capacity    = 4
    pricePerDay = 100000
    status      = "available"
    features    = @("AC")
  })
} catch {
  # ignore "already exists"
}

$suffix = (Get-Random -Minimum 3 -Maximum 30)
$start = (Get-Date).AddDays(-1 * ($suffix + 1)).ToString("yyyy-MM-dd")
$end = (Get-Date).AddDays(-1 * $suffix).ToString("yyyy-MM-dd")

Write-Host "Creating booking with endDate in the past..."
$booking = Invoke-RestMethod -Method Post -Uri "$base/bookings" -Headers $jsonHeaders -Body (ConvertTo-Json @{
  customerName = "Late Tester"
  carNumber    = $carNumber
  startDate    = $start
  endDate      = $end
})

$id = $booking._id
Write-Host "BookingId: $id"

Write-Host "Receiving car..."
Invoke-RestMethod -Method Post -Uri "$base/bookings/$id/receive" -Headers $authHeaders | Out-Null

Write-Host "Completing booking (should be overdue)..."
$complete = Invoke-RestMethod -Method Post -Uri "$base/bookings/$id/complete" -Headers $authHeaders

Write-Host "Complete response:"
$complete | ConvertTo-Json -Depth 6

