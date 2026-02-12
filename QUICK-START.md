# 🚀 QUICK START - Acurast Android Phones Setup

## ✅ État Actuel

```
Backend:     ✅ ONLINE (http://192.168.1.225:8002)
Web Server:  ✅ ONLINE (http://192.168.1.225:8888)
Mode:        ✅ DEV (Bypass Signature)
WiFi:        Tyler5
Devices:     7 devices de test enregistrés
```

---

## 📱 Configuration Android Phones (3 ÉTAPES)

### ÉTAPE 1: Ouvrir l'Interface Web

**Sur chaque Android phone:**
```
http://192.168.1.225:8888/android-checkin.html
```

### ÉTAPE 2: Remplir le Formulaire

```
Backend URL:     http://192.168.1.225:8002  (pré-rempli)
Device Address:  5AndroidPhone001111111111111111111111111111
WiFi SSID:       Tyler5  (pré-rempli)
```

**📌 Device Addresses uniques par phone:**
- Phone 1: `5AndroidPhone001111111111111111111111111111`
- Phone 2: `5AndroidPhone002222222222222222222222222222`
- Phone 3: `5AndroidPhone003333333333333333333333333333`
- etc.

### ÉTAPE 3: Envoyer Check-in

1. **Cliquer "🚀 SEND CHECK-IN"**
   - ✅ Message vert si succès
   - ❌ Message rouge si erreur

2. **Activer Auto Check-in** (optionnel)
   - Cliquer "▶️ START AUTO CHECK-IN"
   - Envoie toutes les 60 secondes
   - Garder navigateur ouvert

---

## 🔍 Vérifier les Devices

### Interface Web:
```
http://192.168.1.225:8002/processor/web/list
```

### Monitor Script (temps réel):
```bash
cd /home/tyler/acurast-darknode-backend
./monitor-devices.sh
```

### Logs Backend:
```bash
docker logs -f acurast-darknode-backend-app-1
```

---

## 🛠️ Commandes Utiles

### Redémarrer Backend:
```bash
docker compose restart app
```

### Rebuild Backend (si changements code):
```bash
docker compose down app
docker compose up -d --build app
```

### Stop/Start tout:
```bash
docker compose down
docker compose up -d
```

### Test Check-in depuis PC:
```bash
curl -X POST http://192.168.1.225:8002/processor/check-in \
  -H "Content-Type: application/json" \
  -d '{
    "deviceAddress": "5TestDevice12345678901234567890123456789012",
    "platform": 0,
    "timestamp": '$(date +%s)',
    "batteryLevel": 88.0,
    "isCharging": false,
    "batteryHealth": "good",
    "temperatures": {"battery": 28, "cpu": 40, "gpu": 37, "ambient": 23},
    "networkType": "wifi",
    "ssid": "Tyler5"
  }'
```

---

## 📂 Fichiers Créés

```
/home/tyler/acurast-darknode-backend/
├── android-checkin.html          # Interface web pour phones
├── ANDROID-SETUP.md              # Doc complète setup
├── QUICK-START.md                # Ce fichier
├── monitor-devices.sh            # Monitor temps réel
├── test-signature-debug.js       # Debug signature (déjà testé)
└── acurast-toolkit.js            # Toolkit CLI (déjà existant)
```

---

## 🐛 Troubleshooting

### ❌ "Network Error" dans l'interface web
- Phone pas sur WiFi Tyler5
- Backend offline: `docker ps | grep acurast`

### ❌ HTTP 403 (Forbidden)
- Whitelist activée dans .env
- Vérifier: `PROCESSOR_WHITELIST=""` (doit être vide)

### ❌ HTTP 401 (Unauthorized)
- Header X-Device-Signature envoyé (ne doit PAS être envoyé en mode bypass)

### ✅ HTTP 201 (Created)
- Check-in accepté!
- Vérifier dans interface: http://192.168.1.225:8002/processor/web/list

---

## 📊 État des Devices Test

Actuellement 7 devices de test enregistrés:
```
5AndroidPhone001111111111111111111111111111 - ✅
5AndroidPhone002222222222222222222222222222 - ✅
5AndroidPhone003333333333333333333333333333 - ✅
5AndroidPhone004444444444444444444444444444 - ✅
5AndroidPhone005555555555555555555555555555 - ✅
5TestAndroidDevice1111111111111111111111111 - ✅
5TestDevice12345678901234567890123456789012 - ✅
```

---

## ⚡ Prochaines Étapes (après validation)

1. ✅ **Validation**: Confirmer que tes Android phones envoient check-ins
2. 🔧 **Fix Bug SS58**: Corriger calcul adresse (signature verification)
3. 🔧 **Fix Bug Températures**: Corriger mapping cpu/gpu dans API
4. 🔐 **Réactiver Signature**: Mode production avec vérification active
5. 📝 **Commit Changes**: Sauvegarder modifications dans git

---

## 📞 Support Quick

**Backend logs:**
```bash
docker logs --tail 50 acurast-darknode-backend-app-1
```

**Check ports:**
```bash
netstat -tulpn | grep -E '8002|8888'
```

**Test connectivity:**
```bash
curl http://192.168.1.225:8002/health
curl http://192.168.1.225:8888/android-checkin.html
```

---

✅ **SYSTÈME PRÊT** - Configure tes Android phones maintenant!

🌐 Interface: http://192.168.1.225:8888/android-checkin.html
