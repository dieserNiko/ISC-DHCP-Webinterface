# ISC-DHCP Webinterface

A modern, high-performance, and secure web interface for managing ISC-DHCP servers. Designed for speed, clarity, and ease of use.

![Dashboard Demo](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=1000)

## Features

- 🚀 **Real-time Dashboard**: Monitor active leases and server status at a glance.
- 🔍 **Intelligent Search**: Filter leases and reservations by IP, hostname, or MAC address.
- 🗂️ **Pool Management**: Organize your subnets into clear tabs.
- 📝 **Live Logs**: Track DHCP events (Requests, ACKs, Offers) in real-time directly in the browser.
- 🔒 **Security**: Authentication via system PAM (Linux users) and JWT sessions.
- ⚙️ **Config Editor**: Edit hosts, subnets, and global options with automatic syntax generation and service restart.
- 🎨 **Premium Design**: Modern dark-mode interface with smooth animations (Framer Motion).
- 🌍 **Multilingual**: Support for English and German with user-selectable language preferences.

## Technology Stack

- **Frontend**: React, Vite, Lucide Icons, Framer Motion, i18next
- **Backend**: Node.js, Express, node-linux-pam
- **DHCP**: ISC-DHCP-Server integration via `dhcpd.conf` and `dhcpd.leases`

## Installation

### Prerequisites

- Ubuntu/Debian Linux
- Node.js (v18+)
- ISC-DHCP-Server (`isc-dhcp-server`)
- Build tools (`build-essential`, `libpam0g-dev`)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/dieserNiko/ISC-DHCP-Webinterface.git
   cd ISC-DHCP-Webinterface
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the frontend:
   ```bash
   npm run build
   ```

4. Set up the Systemd service (optional):
   Adjust the paths in `dhcp-web-admin.service` and copy it:
   ```bash
   sudo cp dhcp-web-admin.service /etc/systemd/system/
   sudo systemctl enable dhcp-web-admin
   sudo systemctl start dhcp-web-admin
   ```

## Security Notes

- The application should be run behind a reverse proxy (e.g., Nginx with SSL) by default.
- Ensure that the `JWT_SECRET` is changed in the production environment.
- The service requires root privileges to read/write DHCP configuration files and restart the service.

## License

MIT License - Copyright (c) 2026 **B&W NetworX GmbH & Co. KG** and **Niko Meister**.
See [LICENSE](LICENSE) for details.

---

# Deutsche Version (German Version)

Ein modernes, performantes und sicheres Webinterface zur Verwaltung von ISC-DHCP-Servern.

## Features (DE)

- 🚀 **Echtzeit-Dashboard**: Behalte aktive Leases und den Serverstatus immer im Blick.
- 🔍 **Intelligente Suche**: Filtere Leases und Reservierungen nach IP, Hostname oder MAC-Adresse.
- 🗂️ **Pool-Management**: Organisiere deine Subnetze in übersichtlichen Tabs.
- 📝 **Live-Protokoll**: Verfolge DHCP-Ereignisse in Echtzeit direkt im Browser.
- 🔒 **Sicherheit**: Authentifizierung über System-PAM und JWT-Sitzungen.
- ⚙️ **Konfigurations-Editor**: Bearbeite Hosts, Subnetze und globale Optionen.
- 🌍 **Mehrsprachig**: Unterstützung für Englisch und Deutsch mit Sprachauswahl pro Nutzer.

## Installation (DE)

Befreie dich von der manuellen Bearbeitung von Konfigurationsdateien. Folge den oben genannten Schritten im englischen Bereich für das Setup.

## Copyright

© 2026 **B&W NetworX GmbH & Co. KG** & **Niko Meister**
Dieses Projekt ist Open Source unter der MIT-Lizenz.
