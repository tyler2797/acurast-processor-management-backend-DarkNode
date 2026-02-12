# API Endpoints - Acurast Backend

**Base URL:** `https://backend.monitor-acurast.com`

---

## 🌐 Interface Web

### `GET /`
Dashboard principal avec statistiques globales (total check-ins, devices actifs, cache status)

### `GET /api`
Documentation API interactive Swagger/OpenAPI

### `GET /health`
Health check - retourne "I'm healthy" si backend fonctionne

### `GET /processor/web/list`
Page HTML listant tous les processors avec leur status actuel (batterie, réseau, dernière activité)

### `GET /processor/web/:address/status`
Page HTML détaillant le status d'un processor spécifique
- **Params:** `:address` = adresse processor (ex: `5H1D34FyKqVGvgqX43r1tHHkvjy2fdMveLjs9znB5GAMDxyx`)

### `GET /processor/web/:address/history`
Page HTML avec historique des check-ins et graphiques de tendance
- **Params:** `:address` = adresse processor, `?limit=100` = nombre d'entrées (default: 10)

### `GET /processor/web/:address/graph`
Graphique interactif des métriques (batterie, température, réseau) sur période
- **Params:** `:address` = adresse processor

---

## 📊 Status API (JSON)

### `GET /processor/api/status`
Retourne status actuel de TOUS les processors (batterie, charging, réseau, SSID, timestamp)

**Utilisation:** Monitoring global de la ferme

### `GET /processor/api/status/bulk`
Récupère status de plusieurs processors en une seule requête
- **Params:** `?addresses=addr1,addr2,addr3` (séparés par virgule)

**Utilisation:** Optimiser requêtes pour subset de processors

### `GET /processor/api/:address/status`
Status actuel d'un processor spécifique
- **Params:** `:address` = adresse processor
- **Response:** `200` OK | `404` Not found

**Utilisation:** Vérifier status d'un téléphone précis

### `GET /processor/api/:address/history`
Historique des check-ins d'un processor
- **Params:** `:address` = adresse processor, `?limit=50` = nombre d'entrées (default: 10)
- **Response:** `200` OK | `404` Not found

**Utilisation:** Analyse tendances batterie/température, debug problèmes

---

## 🏭 Farm Management

### `GET /processor/api/manager/:address/processors`
Liste toutes les adresses processors gérées par un manager spécifique
- **Params:** `:address` = adresse manager

**Utilisation:** Gestion multi-farm, délégation processors

---

## 🔄 Check-in (Appelé par Processors)

### `POST /processor/check-in`
Endpoint de soumission check-in par processors (téléphones)
- **Headers:** `X-Device-Signature` (signature ECDSA obligatoire)
- **Body:** JSON avec deviceAddress, platform, timestamp, batteryLevel, isCharging, temperatures, networkType, ssid
- **Response:** `{ success: true, refreshIntervalInSeconds: 60 }`
- **Status:** `200` Success | `401` Invalid signature | `403` Not whitelisted

**Utilisation:** Téléphones envoient heartbeat toutes les 30 min

---

## 🐛 Debug & Monitoring

### `GET /processor/debug/cache/status`
Statistiques cache (size, capacity) pour processorCache, deviceStatusCache, networkTypeCache, batteryHealthCache

**Utilisation:** Monitor santé cache, détecter saturation

### `GET /processor/debug/cache/contents`
Dump complet du contenu des caches

**Utilisation:** Debug, inspecter données en mémoire

---

## 📝 Exemples d'Utilisation

```bash
# Status de tous les téléphones
curl https://backend.monitor-acurast.com/processor/api/status | jq

# Status d'un téléphone spécifique
curl https://backend.monitor-acurast.com/processor/api/5H1D34FyKqVGvgqX43r1tHHkvjy2fdMveLjs9znB5GAMDxyx/status | jq

# Historique 100 derniers check-ins
curl "https://backend.monitor-acurast.com/processor/api/5H1D34FyKqVGvgqX43r1tHHkvjy2fdMveLjs9znB5GAMDxyx/history?limit=100" | jq

# Status bulk (3 téléphones)
curl "https://backend.monitor-acurast.com/processor/api/status/bulk?addresses=5H1D34FyKqVGvgqX43r1tHHkvjy2fdMveLjs9znB5GAMDxyx,5CQ9ejV7FARwGeSXost9ma6uyykDsvBJsQ3xCch5MHqCtR7j,5G4NVRNc7iL75keoC8b8rM266LVnRqyHXTR1hLMikPLkah1f" | jq

# Health check
curl https://backend.monitor-acurast.com/health

# Cache status
curl https://backend.monitor-acurast.com/processor/debug/cache/status | jq
```

---

**Total endpoints disponibles:** 15
