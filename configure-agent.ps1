Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = "Configurar Life TI Agent"
$form.Size = New-Object System.Drawing.Size(500, 390)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false

$fields = @(
  @{ Label = "URL HTTPS do painel"; Name = "ApiUrl"; Value = "https://painel.empresa.com" },
  @{ Label = "Token individual"; Name = "AgentToken"; Value = "" },
  @{ Label = "Identificador do agente"; Name = "AgentId"; Value = $env:COMPUTERNAME },
  @{ Label = "Faixa IPv4 autorizada"; Name = "Network"; Value = "192.168.1.0/24" }
)
$inputs = @{}
for ($index = 0; $index -lt $fields.Count; $index++) {
  $field = $fields[$index]; $top = 20 + ($index * 60)
  $label = New-Object System.Windows.Forms.Label -Property @{ Text = $field.Label; Location = New-Object System.Drawing.Point(20, $top); AutoSize = $true }
  $input = New-Object System.Windows.Forms.TextBox -Property @{ Text = $field.Value; Location = New-Object System.Drawing.Point(20, ($top + 22)); Size = New-Object System.Drawing.Size(440, 24) }
  if ($field.Name -eq "AgentToken") { $input.UseSystemPasswordChar = $true }
  $form.Controls.AddRange(@($label, $input)); $inputs[$field.Name] = $input
}
$discovery = New-Object System.Windows.Forms.CheckBox -Property @{ Text = "Habilitar descoberta de rede autorizada"; Location = New-Object System.Drawing.Point(20, 265); AutoSize = $true }
$service = New-Object System.Windows.Forms.CheckBox -Property @{ Text = "Instalar e iniciar o serviço automaticamente (requer administrador)"; Location = New-Object System.Drawing.Point(20, 290); AutoSize = $true }
$save = New-Object System.Windows.Forms.Button -Property @{ Text = "Salvar configuração"; Location = New-Object System.Drawing.Point(320, 320); Size = New-Object System.Drawing.Size(140, 28) }
$save.Add_Click({
  if ([string]::IsNullOrWhiteSpace($inputs.ApiUrl.Text) -or [string]::IsNullOrWhiteSpace($inputs.AgentToken.Text) -or [string]::IsNullOrWhiteSpace($inputs.AgentId.Text) -or [string]::IsNullOrWhiteSpace($inputs.Network.Text)) { [System.Windows.Forms.MessageBox]::Show("Preencha todos os campos.", "Life TI Agent"); return }
  if ($inputs.ApiUrl.Text -notmatch '^https://') { [System.Windows.Forms.MessageBox]::Show("A URL do painel deve usar HTTPS.", "Life TI Agent"); return }
  try { & (Join-Path $PSScriptRoot "install.ps1") -ApiUrl $inputs.ApiUrl.Text -AgentToken $inputs.AgentToken.Text -AgentId $inputs.AgentId.Text -Network $inputs.Network.Text -EnableNetworkDiscovery:$discovery.Checked -InstallService:$service.Checked; [System.Windows.Forms.MessageBox]::Show("Configuração salva.", "Life TI Agent"); $form.Close() } catch { [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "Life TI Agent") }
})
$form.Controls.AddRange(@($discovery, $service, $save))
[void]$form.ShowDialog()
