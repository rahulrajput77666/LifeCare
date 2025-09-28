
if ($readme) {
    $null = $sb.AppendLine("## README (excerpt)")
    $null = $sb.AppendLine("Path: " + $readme.FullName)
    $null = $sb.AppendLine('```')  # changed to single quotes
    $null = $sb.AppendLine((SafeRead $readme.FullName 20000))
    $null = $sb.AppendLine('```')  # changed to single quotes
    $null = $sb.AppendLine("")
}
# ...existing code...
        foreach ($m in $matched) {
            $null = $sb.AppendLine("- " + $m.FullName)
            $null = $sb.AppendLine('```')  # changed to single quotes
            $null = $sb.AppendLine((SafeRead $m.FullName 8000))
            $null = $sb.AppendLine('```')  # changed to single quotes
        }
# ...existing code...
    foreach ($mf in $modelFiles) {
        $null = $sb.AppendLine("### " + $mf.Name)
        $null = $sb.AppendLine('```')  # changed to single quotes
        $null = $sb.AppendLine((SafeRead $mf.FullName 10000))
        $null = $sb.AppendLine('```')  # changed to single quotes
    }
# ...existing code...
    if ($found) {
        $null = $sb.AppendLine("### " + $found.FullName)
        $null = $sb.AppendLine('```')  # changed to single quotes
        $null = $sb.AppendLine((SafeRead $found.FullName 20000))
        $null = $sb.AppendLine('```')  # changed to single quotes
    }
