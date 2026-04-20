import { parseNmapText } from "@/parser/nmapTextParser";

const sampleScan = `# Nmap 7.94 scan initiated Mon Apr 20 09:12:02 2026 as: nmap -p- -sSVC -O -T3 -vv --script=default,vuln -iL targets.txt -oA scan_result --system-dns
Starting Nmap 7.94 ( https://nmap.org ) at 2026-04-20 09:12 +06
Nmap scan report for edge-gateway.local (10.8.0.19)
Host is up, received echo-reply ttl 123 (0.0057s latency).
Not shown: 65517 closed tcp ports (reset)
PORT      STATE SERVICE       REASON          VERSION
22/tcp    open  ssh           syn-ack ttl 63  OpenSSH 8.9p1 Ubuntu 3ubuntu0.6
| ssh2-enum-algos:
|   kex_algorithms: (8)
|     curve25519-sha256
|_    diffie-hellman-group14-sha1
80/tcp    open  http          syn-ack ttl 63  Apache httpd 2.4.54
| http-title: Operations Gateway
| http-slowloris-check:
|   VULNERABLE:
|     Slowloris DOS attack
|     State: LIKELY VULNERABLE
|     IDs:  CVE:CVE-2007-6750
|     Disclosure date: 2009-09-17
|     References:
|       https://nvd.nist.gov/vuln/detail/CVE-2007-6750
|_      https://ha.ckers.org/slowloris/
443/tcp   open  ssl/http      syn-ack ttl 63  nginx 1.18.0
| ssl-cert: Subject: commonName=edge-gateway.local
| ssl-enum-ciphers:
|   TLSv1.0:
|     ciphers:
|       TLS_RSA_WITH_3DES_EDE_CBC_SHA
|_  least strength: C
OS details: Linux 4.15 - 5.8
Network Distance: 1 hop

Nmap scan report for fileserver.local (10.8.0.23)
Host is up, received reset ttl 64 (0.0084s latency).
Not shown: 65531 filtered tcp ports (no-response)
PORT      STATE SERVICE      REASON         VERSION
139/tcp   open  netbios-ssn  syn-ack ttl 64 Samba smbd 4.6.2
445/tcp   open  microsoft-ds syn-ack ttl 64 Samba smbd 4.6.2
| smb-vuln-ms17-010:
|   VULNERABLE:
|   Remote Code Execution vulnerability in Microsoft SMBv1 servers (ms17-010)
|     State: VULNERABLE
|     IDs:  CVE:CVE-2017-0143 CVE:CVE-2017-0144 CVE:CVE-2017-0145
|     Risk factor: HIGH
|     References:
|       https://technet.microsoft.com/en-us/library/security/ms17-010.aspx
|_      https://nvd.nist.gov/vuln/detail/CVE-2017-0144
Host script results:
| smb2-security-mode:
|   3:1:1:
|_    Message signing enabled but not required
OS details: Linux 3.10 - 4.11

Nmap scan report for 10.8.0.44
Host is down, received no-response.

# Nmap done at Mon Apr 20 09:29:21 2026 -- 3 IP addresses (2 hosts up) scanned in 1039.25 seconds`;

export const mockScans = [
  parseNmapText(sampleScan, {
    name: "preview_scan_result.nmap",
    size: sampleScan.length,
    lastModified: 1776657122000,
    uploadedAt: "2026-04-20T03:31:00.000Z"
  })
];
