$l = Get-Content -LiteralPath 'Z:\GENAI PROJECTS\lemma\frontend\src\app\c\[id]\page.tsx'
for ($i=0; $i -lt $l.Length; $i++) {
    if ($l[$i] -match 'useEffect|stashed|inputRef\.current = stashed|initialized\.current') {
        Write-Output "$i: $($l[$i])"
    }
}
