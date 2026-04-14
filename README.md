# ISC-DHCP Webinterface

Ein modernes, performantes und sicheres Webinterface zur Verwaltung von ISC-DHCP-Servern. Entwickelt für Geschwindigkeit, Übersichtlichkeit und einfache Bedienung.

![Dashboard Demo](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=1000)

## Features

- 🚀 **Echtzeit-Dashboard**: Behalte aktive Leases und den Serverstatus immer im Blick.
- 🔍 **Intelligente Suche**: Filtere Leases und Reservierungen nach IP, Hostname oder MAC-Adresse.
- 🗂️ **Pool-Management**: Organisiere deine Subnetze in übersichtlichen Tabs.
- 📝 **Live-Protokoll**: Verfolge DHCP-Ereignisse (Requests, ACKs, Offers) in Echtzeit direkt im Browser.
- 🔒 **Sicherheit**: Authentifizierung über System-PAM (Linux-Benutzer) und JWT-Sitzungen.
- ⚙️ **Konfigurations-Editor**: Bearbeite Hosts, Subnetze und globale Optionen mit automatischer Syntax-Generierung und Dienst-Neustart.
- 🎨 **Premium Design**: Modernes Dark-Mode Interface mit flüssigen Animationen (Framer Motion).

## Technologie-Stack

- **Frontend**: React, Vite, Lucide Icons, Framer Motion
- **Backend**: Node.js, Express, node-linux-pam
- **DHCP**: ISC-DHCP-Server integration via `dhcpd.conf` und `dhcpd.leases`

## Installation

### Voraussetzungen

- Ubuntu/Debian Linux
- Node.js (v18+)
- ISC-DHCP-Server (`isc-dhcp-server`)
- Build-Werkzeuge (`build-essential`, `libpam0g-dev`)

### Setup

1. Repository klonen:
   ```bash
   git clone https://github.com/dieserNiko/ISC-DHCP-Webinterface.git
   cd ISC-DHCP-Webinterface
   ```

2. Abhängigkeiten installieren:
   ```bash
   npm install
   ```

3. Frontend bauen:
   ```bash
   npm run build
   ```

4. Systemd Service einrichten (optional):
   Passe die Pfade in `dhcp-web-admin.service` an und kopiere sie:
   ```bash
   sudo cp dhcp-web-admin.service /etc/systemd/system/
   sudo systemctl enable dhcp-web-admin
   sudo systemctl start dhcp-web-admin
   ```

## Sicherheitshinweise

- Die Anwendung sollte standardmäßig hinter einem Reverse-Proxy (z. B. Nginx mit SSL) betrieben werden.
- Stelle sicher, dass das `JWT_SECRET` in der Produktionsumgebung geändert wird.
- Der Dienst benötigt Root-Rechte, um die DHCP-Konfigurationsdateien zu lesen/schreiben und den Dienst neu zu starten.

## Lizenz

MIT License - Copyright (c) 2026 **B&W NetworX GmbH & Co. KG** und **Niko Meister**.
Siehe [LICENSE](LICENSE) für Details.
