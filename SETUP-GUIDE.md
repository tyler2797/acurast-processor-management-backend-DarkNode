# Acurast Backend - Guide de Configuration Complète

## 🎯 Configuration Actuelle

**Backend URL:** `https://backend.monitor-acurast.com`
**Local URL:** `http://192.168.1.165:8002`
**Database:** PostgreSQL 16 (Docker)
**Tunnel:** Cloudflare (systemd service)

---

## 📋 Prérequis

- Docker & Docker Compose
- Node.js 18+
- Cloudflare account (pour tunnel HTTPS)
- 8 téléphones Acurast Core

---

## 🚀 Installation

### 1. Clone et Configuration

```bash
git clone https://github.com/tyler2797/acurast-processor-management-backend-DarkNode.git
cd acurast-processor-management-backend-DarkNode
npm install
```

### 2. Configuration Environnement

Créer `.env`:

```bash
PORT=9001
ENVIRONMENT=production
DB_HOST=db
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=acurast_processor
PROCESSOR_WHITELIST=""
REFRESH_INTERVAL_IN_SECONDS=60
RPC_URL=wss://public-rpc.mainnet.acurast.com
```

### 3. Lancer Backend

```bash
docker compose up -d
```

Vérifier:
```bash
curl http://localhost:8002/health
# Retourne: "I'm healthy"
```

---

## 🌐 Configuration Tunnel Cloudflare

### Installation

```bash
# Certificat déjà téléchargé dans ~/.cloudflared/cert.pem
```

### Créer Tunnel Permanent

```bash
cloudflared tunnel create acurast-backend
cloudflared tunnel route dns acurast-backend backend.monitor-acurast.com
```

### Configuration (`~/.cloudflared/config.yml`)

```yaml
tunnel: <tunnel-id>
credentials-file: ~/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: backend.monitor-acurast.com
    service: http://192.168.1.165:8002
  - service: http_status:404
```

### Service Systemd

Fichier: `/etc/systemd/system/cloudflared-acurast.service`

```ini
[Unit]
Description=Cloudflare Tunnel for Acurast Backend
After=network.target

[Service]
Type=simple
User=tyler
ExecStart=/usr/local/bin/cloudflared tunnel --config /home/tyler/.cloudflared/config.yml run
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

Activer:
```bash
sudo systemctl enable cloudflared-acurast.service
sudo systemctl start cloudflared-acurast.service
```

---

## 📱 Configuration Téléphones Acurast

### Adresses des 8 Téléphones

```
5CQ9ejV7FARwGeSXost9ma6uyykDsvBJsQ3xCch5MHqCtR7j
5H1D34FyKqVGvgqX43r1tHHkvjy2fdMveLjs9znB5GAMDxyx
5FrmNK5gk8B6bt89zCFsMS2itp6dXVGZaiqgJMXpCMJN6Jbh
5FsodkTRiywsr9zxFjULdAKt2M3pjqoK1mJFSQTYDdek1JZ1
5G4NVRNc7iL75keoC8b8rM266LVnRqyHXTR1hLMikPLkah1f
5FNhcrgCU7KCn1aREHBWmVJahcGX2Ukf5QyUsm9DqSAJxvJR
5G3mp5m6r8i3Pgf2D2vCdfxUe64jaNB7HCAcBMLHe6ATgxXv
5HdVE6WjTDRXMX2AK1P6EAJBJtZ9ePBdfcRorK7VtwmgexhP
```

### Configuration Hub Web

1. Ouvrir Acurast Hub Web
2. Aller dans section "Phones"
3. Activer "Advanced Settings"
4. Configurer **Management Endpoint:**
   ```
   https://backend.monitor-acurast.com
   ```
5. Cliquer "Set Endpoint"
6. Cliquer "Update Processors" pour forcer les téléphones à appliquer la config

### Configuration Réseau Téléphones

**Starlink isole WiFi et Ethernet** - Les téléphones DOIVENT utiliser l'IP WiFi, pas Ethernet!

- **IP WiFi Machine:** `192.168.1.165`
- **IP Téléphones:** `192.168.1.100-107` (static)
- **Gateway:** `192.168.1.1`
- **DNS:** `8.8.8.8`, `8.8.4.4`

---

## 📊 Monitoring

### Dashboards Web

```
https://backend.monitor-acurast.com/processor/web/list
https://backend.monitor-acurast.com/
```

### API Status

```bash
# Tous téléphones
curl https://backend.monitor-acurast.com/processor/api/status | jq

# Un téléphone
curl https://backend.monitor-acurast.com/processor/api/5H1D34FyKqVGvgqX43r1tHHkvjy2fdMveLjs9znB5GAMDxyx/status | jq
```

### Logs Backend

```bash
docker logs -f acurast-darknode-backend-app-1 | grep "check-in"
```

### Database

```bash
docker exec -it acurast-darknode-backend-db-1 psql -U postgres -d acurast_processor
```

---

## 🔧 Dépannage

### Tunnel Cloudflare ne démarre pas

```bash
sudo systemctl restart cloudflared-acurast.service
sudo systemctl status cloudflared-acurast.service
```

### Backend ne répond pas

```bash
docker compose restart app
docker logs --tail 100 acurast-darknode-backend-app-1
```

### Téléphones ne check-in pas

1. Vérifier endpoint Hub: `https://backend.monitor-acurast.com`
2. Cliquer "Update Processors" dans Hub
3. Vérifier tunnel: `curl https://backend.monitor-acurast.com/health`
4. Attendre 30 minutes (cycle naturel)

---

## ⚠️ Notes Importantes

### Check-in Frequency

- **Documentation officielle:** 30 minutes
- **Observé en pratique:** Variable (certains téléphones toutes les 60s, d'autres 30 min)
- **Backend `refreshIntervalInSeconds`:** 60 (envoyé aux téléphones mais peut être ignoré)

### Sécurité

**⚠️ CETTE BRANCHE (`working-setup`) CONTIENT DES MODIFICATIONS TEMPORAIRES:**

1. **Bypass signature verification** (`src/processor/processor.service.ts` lignes 203-216)
   - Accepte check-ins SANS signature si header manquant
   - **NE PAS utiliser en production publique!**

2. **Debug logging excessif** (`src/processor/processor.controller.ts` lignes 241-250)
   - Logs détaillés de chaque check-in
   - Expose données device dans stdout

**Pour production sécurisée:** Voir branche `main` avec code propre.

### Réseau

- Starlink **isole WiFi ↔ Ethernet**
- Backend accessible sur **DEUX IPs:**
  - `192.168.1.165` (WiFi) ← Téléphones utilisent celle-ci
  - `192.168.1.225` (Ethernet) ← Accessible depuis LAN Ethernet seulement
- Tunnel Cloudflare expose backend via HTTPS publiquement

---

## 📈 Statistiques Actuelles

- **8 téléphones** configurés
- **6-7 téléphones** actifs en moyenne
- **Check-ins/jour:** ~1000+ (dépend de la fréquence)
- **Uptime backend:** >99% (systemd auto-restart)

---

## 🔗 Liens Utiles

- **Backend Public:** https://backend.monitor-acurast.com
- **Dashboard:** https://backend.monitor-acurast.com/processor/web/list
- **API Docs:** https://backend.monitor-acurast.com/api
- **GitHub Repo:** https://github.com/tyler2797/acurast-processor-management-backend-DarkNode
- **Acurast Docs:** https://docs.acurast.com
