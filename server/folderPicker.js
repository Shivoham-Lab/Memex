import { execSync } from 'child_process';

/** Open a native folder picker dialog on the local machine */
export function pickFolder() {
  try {
    // Try using PowerShell to open a folder picker on Windows
    if (process.platform === 'win32') {
      const script = `
        Add-Type -AssemblyName System.Windows.Forms
        $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
        $dialog.Description = "Select Project Folder"
        $dialog.ShowNewFolderButton = $false
        if ($dialog.ShowDialog() -eq "OK") { $dialog.SelectedPath }
      `;
      const result = execSync(`powershell -Command "${script.replace(/"/g, '\\"')}"`, { encoding: 'utf-8', timeout: 30000 });
      return result.trim() || null;
    }

    // macOS/Linux: try using zenity or similar
    if (process.platform === 'darwin') {
      const result = execSync('osascript -e "POSIX path of (choose folder)"', { encoding: 'utf-8', timeout: 30000 });
      return result.trim() || null;
    }

    return null;
  } catch {
    // Fallback: return null and let dashboard use text input
    return null;
  }
}
