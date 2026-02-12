# 🎯 Configuration Acurast Core pour Stats Réelles

## Objectif

Faire en sorte que tes **Acurast Core devices** envoient leurs **vraies stats** (batterie, température, réseau) au backend local au lieu des stats simulées depuis PC.

---

## 🔧 Solution: Configurer l'App Acurast sur les Devices

Les Acurast Core ont probablement l'app Acurast préinstallée. Il faut la configurer pour pointer vers ton backend local.

### Méthode 1: Via Interface App (si écran tactile)

**Sur chaque Acurast Core device:**

1. **Ouvrir l'app Acurast**
   - Icône Acurast sur l'écran d'accueil
   - Ou dans Settings → Apps → Acurast

2. **Aller dans Settings/Configuration**
   - Menu hamburger (☰) → Settings
   - Ou Settings → Acurast Settings

3. **Modifier Backend URL:**
   ```
   Backend URL:          http://192.168.1.225:8002
   Check-in Endpoint:    /processor/check-in
   ```

4. **Désactiver Signature Verification:**
   ```
   Signature Mode:       DISABLED
   Verify Signature:     OFF
   ```
   Ou simplement ne pas envoyer le header `X-Device-Signature`

5. **Configuration Check-in:**
   ```
   Check-in Interval:    60 seconds (ou 1 minute)
   Auto Check-in:        ENABLED
   Background Mode:      ENABLED
   ```

6. **WiFi Configuration:**
   ```
   SSID:                 Tyler5
   Auto-connect:         ENABLED
   ```

7. **Sauvegarder et Redémarrer l'app**
   - Apply/Save
   - Force stop app
   - Redémarrer

---

### Méthode 2: Via Fichier de Configuration (si accès SSH/fichiers)

Si tu peux accéder aux fichiers de config des devices:

**Localisation probable du fichier config:**
```
/data/data/com.acurast.app/shared_prefs/config.xml
/data/data/com.acurast.processor/shared_prefs/config.xml
/sdcard/Acurast/config.json
/storage/emulated/0/Acurast/config.json
```

**Contenu à modifier (exemple JSON):**
```json
{
  "backendUrl": "http://192.168.1.225:8002",
  "checkInEndpoint": "/processor/check-in",
  "checkInInterval": 60,
  "signatureMode": "disabled",
  "autoCheckIn": true,
  "networkConfig": {
    "ssid": "Tyler5",
    "autoConnect": true
  }
}
```

**Si XML (SharedPreferences Android):**
```xml
<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
    <string name="backend_url">http://192.168.1.225:8002</string>
    <string name="checkin_endpoint">/processor/check-in</string>
    <int name="checkin_interval" value="60" />
    <boolean name="signature_disabled" value="true" />
    <boolean name="auto_checkin" value="true" />
    <string name="wifi_ssid">Tyler5</string>
</map>
```

**Comment appliquer:**
```bash
# Via SSH ou ADB (si possible)
adb push config.json /sdcard/Acurast/config.json
adb shell am force-stop com.acurast.app
adb shell am start com.acurast.app/.MainActivity

# Ou via SSH
scp config.json acurast-device:/data/acurast/config.json
ssh acurast-device 'systemctl restart acurast-app'
```

---

### Méthode 3: Via API REST du Device (si disponible)

Certains Acurast Core devices ont une API REST locale pour configuration.

**Découvrir l'IP des devices sur le réseau:**
```bash
# Scan réseau pour trouver les devices
nmap -sn 192.168.1.0/24 | grep -B 2 "Acurast\|Android"

# Ou
arp -a | grep -i "192.168.1"
```

**Envoyer config via API (exemple):**
```bash
# Supposons device à 192.168.1.100
curl -X POST http://192.168.1.100:8080/config \
  -H "Content-Type: application/json" \
  -d '{
    "backendUrl": "http://192.168.1.225:8002",
    "checkInEndpoint": "/processor/check-in",
    "signatureDisabled": true,
    "checkInInterval": 60
  }'
```

---

### Méthode 4: Via Interface Web du Device (si disponible)

Certains Acurast Core ont une interface web embarquée.

**Accéder à l'interface:**
```
http://192.168.1.XXX:8080/admin
http://192.168.1.XXX/config
```

**Modifier les settings:**
- Backend URL: `http://192.168.1.225:8002`
- Signature: Disabled
- Check-in interval: 60s

---

## 🔍 Vérifier la Configuration

Une fois configurés, les devices devraient envoyer automatiquement leurs check-ins.

### 1. Vérifier les Logs Backend

```bash
docker logs -f acurast-darknode-backend-app-1 | grep "New check-in"
```

**Tu devrais voir:**
```
New check-in received from 5XXX...
[DEBUG] No signature provided - SKIPPING VERIFICATION
```

### 2. Vérifier l'Interface Web

```
http://192.168.1.225:8002/processor/web/list
```

**Les vraies stats apparaîtront:**
- Batterie: Valeur réelle du device
- Température: CPU/GPU/Battery réelles
- Network: WiFi réel (Tyler5)
- Timestamp: Mis à jour toutes les 60s

### 3. Comparer Anciens vs Nouveaux Check-ins

**Anciens (depuis PC):**
- Batterie: Toujours ~80-90% statique
- Timestamp: Ponctuel (quand tu as lancé curl)
- Temperature: Random fixe

**Nouveaux (depuis devices):**
- Batterie: Varie (se décharge/charge)
- Timestamp: Mis à jour régulièrement (60s)
- Temperature: Varie selon usage réel

---

## 📊 Format Check-in Attendu

Les Acurast Core devraient envoyer:

```json
{
  "deviceAddress": "5XXX...",
  "platform": 0,
  "timestamp": 1770882835,
  "batteryLevel": 72.5,
  "isCharging": true,
  "batteryHealth": "good",
  "temperatures": {
    "battery": 31.2,
    "cpu": 45.8,
    "gpu": 42.3,
    "ambient": 24.5
  },
  "networkType": "wifi",
  "ssid": "Tyler5"
}
```

**Sans header** `X-Device-Signature` (bypass mode)

---

## 🐛 Troubleshooting

### Device ne se connecte pas

**1. Vérifier WiFi:**
```bash
# Sur le device (si SSH possible)
iwconfig
nmcli device wifi list
```

**2. Vérifier connectivité:**
```bash
# Sur le device
ping 192.168.1.225
curl http://192.168.1.225:8002/health
```

**3. Vérifier logs app:**
```bash
# Via ADB (si possible)
adb logcat | grep -i acurast

# Ou sur device
logcat | grep Acurast
```

### Check-in rejeté (HTTP 401)

**Solution:**
- S'assurer que signature est **désactivée**
- Vérifier header `X-Device-Signature` n'est **PAS envoyé**
- Vérifier logs backend:
  ```bash
  docker logs acurast-darknode-backend-app-1 | grep "SKIPPING VERIFICATION"
  ```

### Device Address incorrecte

**Solution:**
- Chaque device doit avoir une adresse SS58 **unique**
- Format: `5XXX...` (51 caractères)
- Pas de collision entre devices

---

## 📞 Si Accès Impossible aux Devices

**Si tu ne peux PAS accéder directement aux Acurast Core:**

1. **Contacter support Acurast:**
   - Demander comment configurer backend URL custom
   - Documentation officielle Acurast Core

2. **Utiliser dashboard Acurast (si existe):**
   - Interface web centrale pour gérer devices
   - Modifier config depuis dashboard

3. **Fichier de config centralisé:**
   - Certains setups utilisent config server
   - Modifier config server → devices se mettent à jour

---

## ✅ Checklist Configuration

- [ ] App Acurast accessible sur devices
- [ ] Backend URL changée: `http://192.168.1.225:8002`
- [ ] Signature désactivée (bypass mode)
- [ ] Check-in interval: 60s
- [ ] Auto check-in activé
- [ ] Devices sur WiFi Tyler5
- [ ] App redémarrée
- [ ] Logs backend montrent check-ins
- [ ] Interface web affiche vraies stats

---

## 🎯 Résumé

**Objectif:** Vraies stats des Acurast Core devices

**Solution:**
1. Configurer app Acurast sur devices
2. Backend URL → `http://192.168.1.225:8002`
3. Désactiver signature
4. Activer auto check-in (60s)
5. Vérifier dans interface web

**Résultat attendu:**
- ✅ Vraie batterie
- ✅ Vraies températures
- ✅ Vrai réseau
- ✅ Updates automatiques toutes les 60s

---

📌 **Si tu me dis comment accéder aux Acurast Core (écran? SSH? API?), je peux te donner des instructions plus précises!**
