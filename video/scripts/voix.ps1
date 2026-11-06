# Voix off des publicités Keyli : voix françaises de Windows (OneCore).
# Une piste WAV par phrase (public/voix/<voix>-<id>.wav) et un fichier de
# durées (public/voix/durees.json) qui sert à caler les scènes.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]

$asTaskGenerique = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Attendre($operation, [Type]$type) {
  $tache = $asTaskGenerique.MakeGenericMethod($type).Invoke($null, @($operation))
  $null = $tache.Wait(-1)
  $tache.Result
}

$racine = Split-Path -Parent $PSScriptRoot
$lignes = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot 'texte-pub.json') | ConvertFrom-Json
$sortie = Join-Path $racine 'public\voix'
New-Item -ItemType Directory -Force $sortie | Out-Null

# Réglages : débit légèrement accéléré, ton ajusté pour un rendu « pub »
$voix = @(
  @{ nom = 'femme'; motif = 'Julie'; debit = '+10%'; ton = '+0%' },
  @{ nom = 'homme'; motif = 'Paul'; debit = '+10%'; ton = '-4%' }
)
$durees = @{}
foreach ($v in $voix) {
  $synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
  $synth.Voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices |
    Where-Object { $_.DisplayName -like "*$($v.motif)*" } | Select-Object -First 1
  if (-not $synth.Voice) { throw "Voix $($v.motif) introuvable" }
  $durees[$v.nom] = @{}
  foreach ($l in $lignes) {
    $texte = [System.Security.SecurityElement]::Escape($l.texte)
    $ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='fr-FR'>" +
      "<prosody rate='$($v.debit)' pitch='$($v.ton)'>$texte</prosody></speak>"
    $flux = Attendre ($synth.SynthesizeSsmlToStreamAsync($ssml)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
    $taille = [uint32]$flux.Size
    $lecteur = New-Object Windows.Storage.Streams.DataReader($flux.GetInputStreamAt(0))
    $null = Attendre ($lecteur.LoadAsync($taille)) ([uint32])
    $octets = New-Object byte[] $taille
    $lecteur.ReadBytes($octets)
    $fichier = Join-Path $sortie "$($v.nom)-$($l.id).wav"
    [IO.File]::WriteAllBytes($fichier, $octets)
    # Durée = données PCM / octets par seconde (en-tête WAV, octets 28-31)
    $octetsParSeconde = [BitConverter]::ToUInt32($octets, 28)
    $durees[$v.nom][$l.id] = [math]::Round(($taille - 44) / $octetsParSeconde, 3)
    Write-Output "$($v.nom) $($l.id) : $($durees[$v.nom][$l.id]) s"
  }
}
# Copie sans BOM lue par les compositions (src/durees-voix.json)
$json = $durees | ConvertTo-Json -Depth 4
[IO.File]::WriteAllText((Join-Path $racine 'src\durees-voix.json'), $json, (New-Object Text.UTF8Encoding($false)))
