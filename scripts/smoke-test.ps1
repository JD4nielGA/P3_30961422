$base='http://localhost:3000'
# Esperar hasta 30s a que /health responda
for ($i=0;$i -lt 30;$i++){
  try{
    $r = Invoke-RestMethod -Uri "$base/health" -Method Get -UseBasicParsing -Headers @{Accept='application/json'} -TimeoutSec 2
    if ($r.status -eq 'OK') { Write-Host "SERVER_READY"; break }
  } catch {}
  Start-Sleep -Seconds 1
}

$timestamp = [int][double]::Parse((Get-Date -UFormat %s))
$username = "smoke_user_$timestamp"
$email = "smoke_$timestamp@example.com"
$password = "password123"

function POST($path, $body, $token){
  $h = @{ 'Accept'='application/json'; 'Content-Type'='application/json' }
  if ($token) { $h['Authorization'] = "Bearer $token" }
  return Invoke-RestMethod -Uri "$base$path" -Method Post -Body ($body | ConvertTo-Json -Depth 10) -Headers $h -UseBasicParsing
}
function GET($path,$token){ $h = @{ 'Accept'='application/json' }; if ($token){ $h['Authorization'] = "Bearer $token" }; return Invoke-RestMethod -Uri "$base$path" -Method Get -Headers $h -UseBasicParsing }

Write-Host "1) Registro de usuario: $username"
try{
  $reg = POST '/api/auth/register' @{ username=$username; email=$email; password=$password; confirmPassword=$password }
  Write-Host "  REG_RES:"; $reg | ConvertTo-Json -Depth 4
} catch { Write-Host "  Registro pudo fallar (posible usuario existente), error:"; Write-Host $_.Exception.Message }

Write-Host "2) Login"
$token = $null
try{
  $login = POST '/api/auth/login' @{ username=$username; password=$password }
  if ($login.token) { $token = $login.token; Write-Host "  Token recibido" } else { Write-Host "  Login response:"; $login | ConvertTo-Json -Depth 4 }
} catch { Write-Host "  Login error:"; Write-Host $_.Exception.Message }

if (-not $token){ Write-Host "No se obtuvo token, abortando pruebas"; exit 1 }

Write-Host "3) Obtener productos públicos"
$products = $null
try{ $products = GET '/api/public/products' $token; Write-Host "  Productos obtenidos: "; ($products.data | Measure-Object).Count } catch { Write-Host "  Error obtener productos:"; Write-Host $_.Exception.Message }

if (-not $products -or -not $products.data -or $products.data.Count -eq 0){ Write-Host "No hay productos para comprar. Prueba terminada."; exit 1 }

$first = $products.data[0]
Write-Host "4) Crear orden con producto id: $($first.id)"
try{
  $orderReq = @{ items = @(@{ productId = $first.id; quantity = 1 }); paymentMethod = 'card'; paymentDetails = @{ card_number='4242424242424242'; expiry_date='12/30'; cvv='123'; card_holder='Smoke Tester' } }
  $orderRes = POST '/api/orders' $orderReq $token
  Write-Host "  Orden creada:"; $orderRes | ConvertTo-Json -Depth 6
} catch { Write-Host "  Error creando orden:"; Write-Host $_.Exception.Message; exit 1 }

Write-Host "5) Listar pedidos del usuario"
try{
  $list = GET '/api/orders' $token
  Write-Host "  Pedidos encontrados:"; ($list.data.rows | Measure-Object).Count; $list | ConvertTo-Json -Depth 6
} catch { Write-Host "  Error listando pedidos:"; Write-Host $_.Exception.Message }

Write-Host "SMOKE_TEST_DONE"