$ErrorActionPreference = 'SilentlyContinue'

$configPath = Join-Path $PSScriptRoot "config.json"
$config = @{
    hostname = "DESKTOP-NE1CNST"
    lastKnownIp = "192.168.1.10"
    port = 3000
}

if (Test-Path $configPath) {
    try {
        $loaded = Get-Content $configPath -Raw | ConvertFrom-Json
        if ($loaded.hostname) { $config.hostname = $loaded.hostname }
        if ($loaded.lastKnownIp) { $config.lastKnownIp = $loaded.lastKnownIp }
        if ($loaded.port) { $config.port = [int]$loaded.port }
    } catch {}
}

$port = [int]$config.port

function Test-DnDServer($hostOrIp) {
    if (-not $hostOrIp) { return $false }
    try {
        $url = "http://" + $hostOrIp + ":" + $port + "/api/health"
        $req = [System.Net.WebRequest]::Create($url)
        $req.Timeout = 2000
        $req.ReadWriteTimeout = 2000
        $resp = $req.GetResponse()
        $stream = $resp.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $text = $reader.ReadToEnd()
        $reader.Close()
        $stream.Close()
        $resp.Close()
        return ($text -match '"ok":\s*true')
    } catch {
        return $false
    }
}

function Save-Config($workingHost) {
    try {
        $config.lastKnownIp = $workingHost
        $config | ConvertTo-Json | Set-Content -Path $configPath -Force
    } catch {}
}

$scannerCode = @"
using System;
using System.Net.Sockets;
using System.Threading.Tasks;
using System.Collections.Generic;

public class FastPortScanner {
    public static string ScanSubnet(string subnetPrefix, int port, int timeoutMs) {
        var tasks = new List<Task<string>>();
        for (int i = 1; i <= 254; i++) {
            string ip = subnetPrefix + "." + i;
            tasks.Add(Task.Run(async () => {
                try {
                    using (var client = new TcpClient()) {
                        var connectTask = client.ConnectAsync(ip, port);
                        var delayTask = Task.Delay(timeoutMs);
                        if (await Task.WhenAny(connectTask, delayTask) == connectTask && client.Connected) {
                            return ip;
                        }
                    }
                } catch {}
                return null;
            }));
        }

        while (tasks.Count > 0) {
            var completedTask = Task.WhenAny(tasks).GetAwaiter().GetResult();
            tasks.Remove(completedTask);
            var result = completedTask.GetAwaiter().GetResult();
            if (!string.IsNullOrEmpty(result)) {
                return result;
            }
        }
        return null;
    }
}
"@

try {
    Add-Type -TypeDefinition $scannerCode
} catch {}

function Find-Server {
    # 1. Fast direct trials (IP first, then hostnames)
    if (Test-DnDServer $config.lastKnownIp) { return $config.lastKnownIp }
    if (Test-DnDServer $config.hostname) { return $config.hostname }
    if (Test-DnDServer ($config.hostname + ".local")) { return ($config.hostname + ".local") }

    # 2. Local subnets fast scan
    $subnets = @()
    try {
        Add-Type -AssemblyName System.Net.NetworkInformation
        foreach ($ni in [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
            if ($ni.OperationalStatus -ne 'Up' -or $ni.NetworkInterfaceType -eq 'Loopback') { continue }
            foreach ($addr in $ni.GetIPProperties().UnicastAddresses) {
                if ($addr.Address.AddressFamily -eq 'InterNetwork') {
                    $parts = $addr.Address.ToString().Split('.')
                    if ($parts.Length -eq 4) {
                        $prefix = $parts[0] + "." + $parts[1] + "." + $parts[2]
                        if (-not $subnets.Contains($prefix)) { $subnets += $prefix }
                    }
                }
            }
        }
    } catch {}

    foreach ($subnet in $subnets) {
        try {
            $candidate = [FastPortScanner]::ScanSubnet($subnet, $port, 800)
            if ($candidate -and (Test-DnDServer $candidate)) {
                return $candidate
            }
        } catch {}
    }

    return $null
}

# Main loop
while ($true) {
    $found = Find-Server
    if ($found) {
        Save-Config $found
        $playerUrl = "http://" + $found + ":" + $port + "?mode=player"
        Start-Process $playerUrl
        exit 0
    }

    # Prompt user with dialog
    try {
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName Microsoft.VisualBasic
    } catch {}

    $msg = "Server DnD Companion nebyl na siti nalezen.`n`n" +
           "Ujisti se, ze:`n" +
           "1. Jsi pripojen ke stejne Wi-Fi jako DM.`n" +
           "2. DM ma aplikaci jiz spustenou na svem pocitaci.`n`n" +
           "Prejes si zadat IP adresu DM rucne?"

    $choice = [System.Windows.Forms.MessageBox]::Show(
        $msg,
        "DnD Companion - Server nenalezen",
        [System.Windows.Forms.MessageBoxButtons]::YesNoCancel,
        [System.Windows.Forms.MessageBoxIcon]::Question
    )

    if ($choice -eq [System.Windows.Forms.DialogResult]::Yes) {
        $manual = [Microsoft.VisualBasic.Interaction]::InputBox(
            "Zadej IP adresu pocitace DM (napr. 192.168.1.10):",
            "Rucni zadani IP adresy",
            $config.lastKnownIp
        )
        if ($manual) {
            $manual = $manual.Trim().Replace("http://", "").Replace("/", "").Split(':')[0]
            if (Test-DnDServer $manual) {
                Save-Config $manual
                $playerUrl = "http://" + $manual + ":" + $port + "?mode=player"
                Start-Process $playerUrl
                exit 0
            } else {
                [System.Windows.Forms.MessageBox]::Show(
                    "Na adrese " + $manual + ":" + $port + " server neodpovida.",
                    "Chyba spojeni",
                    [System.Windows.Forms.MessageBoxButtons]::OK,
                    [System.Windows.Forms.MessageBoxIcon]::Warning
                ) | Out-Null
            }
        }
    } elseif ($choice -eq [System.Windows.Forms.DialogResult]::No) {
        # Retry scan
        continue
    } else {
        exit 1
    }
}
